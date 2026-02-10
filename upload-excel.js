#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MongoClient } from 'mongodb';
import XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'url';

dotenv.config();

// MongoDB Connection Details
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'mindful_db';
const MONGODB_DB_COLLECTION = process.env.MONGODB_DB_COLLECTION || 'items';
const ID_PREFIX = process.env.ID_PREFIX || 'spb';

let db;

/**
 * Ensures a connection to the MongoDB database.
 */
async function ensureDb() {
  if (!db) {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB_NAME);
  }
  return db;
}

/**
 * Gets the next sequential ID with the specified prefix.
 * Uses a 'counters' collection to track the sequence.
 */
async function getNextId(prefix = ID_PREFIX) {
  const database = await ensureDb();
  const counterCollection = database.collection('counters');

  const result = await counterCollection.findOneAndUpdate(
    { _id: 'item_id' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  const num = result.seq || 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

/**
 * Maps a row from Excel to a JSON object based on the provided mapping.
 */
export function mapRowData(row, columnMapping = {}) {
  if (!columnMapping || Object.keys(columnMapping).length === 0) {
    return row;
  }

  const item = {};
  for (const [jsonField, excelHeader] of Object.entries(columnMapping)) {
    if (jsonField.includes('.')) {
      const [parent, child] = jsonField.split('.');
      if (!item[parent]) item[parent] = {};
      item[parent][child] = row[excelHeader];
    } else {
      item[jsonField] = row[excelHeader];
    }
  }
  return item;
}

/**
 * Reads an Excel file and maps its rows to JSON objects.
 */
function parseExcelToJSON(filePath, columnMapping = {}) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  return data.map(row => mapRowData(row, columnMapping));
}

// Create the modern McpServer
const server = new McpServer({
  name: "mindful-mapper-mongo",
  version: "1.0.0",
});

// Tool: Import from Excel to MongoDB
server.tool(
  "import_from_excel",
  "Import data from an Excel file (.xlsx) into MongoDB with optional mapping and auto-generated IDs.",
  {
    file_path: z.string().describe("The absolute path to the Excel file"),
    collection_name: z.string().optional().default(MONGODB_DB_COLLECTION).describe("The target MongoDB collection name"),
    column_mapping: z.record(z.string()).optional().describe("Mapping between JSON fields and Excel headers (e.g., {'name.en': 'Product Name EN'})"),
    clear_existing: z.boolean().optional().default(false).describe("Whether to clear the collection before importing"),
    generate_id: z.boolean().optional().default(true).describe("Whether to auto-generate unique sequence IDs (e.g., spb-0001)"),
    id_prefix: z.string().optional().default(ID_PREFIX).describe("Prefix for auto-generated IDs"),
  },
  async ({ file_path, clear_existing, collection_name, column_mapping, generate_id, id_prefix }) => {
    try {
      if (!fs.existsSync(file_path)) {
        return {
          content: [{ type: "text", text: `❌ File not found: ${file_path}` }],
          isError: true
        };
      }

      const database = await ensureDb();
      const rawItems = parseExcelToJSON(file_path, column_mapping);
      const targetCollection = database.collection(collection_name);

      if (clear_existing) {
        await targetCollection.deleteMany({});
        if (generate_id) {
          // Reset counter if clearing
          await database.collection('counters').updateOne({ _id: 'item_id' }, { $set: { seq: 0 } }, { upsert: true });
        }
      }

      const items = [];
      for (const item of rawItems) {
        const newItem = { ...item };
        if (generate_id) {
          newItem.id = await getNextId(id_prefix);
        }
        newItem.createdAt = new Date();
        newItem.updatedAt = new Date();
        items.push(newItem);
      }

      const result = await targetCollection.insertMany(items);
      const generatedIds = generate_id ? items.map(i => i.id).join(', ') : '';

      return {
        content: [{
          type: "text",
          text: `✅ Successfully imported ${result.insertedCount} items into collection: ${collection_name}!\n` +
            (generatedIds ? `🆔 Generated IDs: ${generatedIds}` : '')
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: Export from MongoDB to Excel
server.tool(
  "export_to_excel",
  "Export a MongoDB collection to an Excel file.",
  {
    output_path: z.string().describe("The absolute path where the Excel file should be saved"),
    collection_name: z.string().optional().default(MONGODB_DB_COLLECTION).describe("The source MongoDB collection name"),
  },
  async ({ output_path, collection_name }) => {
    try {
      const database = await ensureDb();
      const items = await database.collection(collection_name).find({}).toArray();

      const excelData = items.map(item => {
        const flatItem = { ...item };
        delete flatItem._id;
        return flatItem;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      XLSX.writeFile(workbook, output_path);

      return {
        content: [{
          type: "text",
          text: `✅ Successfully exported ${items.length} items from collection: ${collection_name} to file: ${output_path}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Tool: View Collection Stats
server.tool(
  "view_stats",
  "Get statistics for a specific MongoDB collection, including ID tracking.",
  {
    collection_name: z.string().optional().default(MONGODB_DB_COLLECTION).describe("The collection name to analyze"),
  },
  async ({ collection_name }) => {
    try {
      const database = await ensureDb();
      const items = await database.collection(collection_name).find({}).toArray();
      const counter = await database.collection('counters').findOne({ _id: 'item_id' });

      if (items.length === 0) {
        return {
          content: [{ type: "text", text: `📊 No data found in collection: ${collection_name}` }]
        };
      }

      const stats = {
        total: items.length,
        priceRange: {
          min: Math.min(...items.map(i => i.price || 0)),
          max: Math.max(...items.map(i => i.price || 0)),
          avg: (items.reduce((sum, i) => sum + (i.price || 0), 0) / items.length).toFixed(2)
        },
        idSystem: {
          lastId: counter ? `${ID_PREFIX}-${String(counter.seq).padStart(4, '0')}` : 'None',
          nextId: counter ? `${ID_PREFIX}-${String(counter.seq + 1).padStart(4, '0')}` : `${ID_PREFIX}-0001`
        }
      };

      return {
        content: [{
          type: "text",
          text: `📊 Collection Stats: ${collection_name}\n\n` +
            `Total Items: ${stats.total}\n\n` +
            `Price Analysis:\n` +
            `- Min: ${stats.priceRange.min}\n` +
            `- Max: ${stats.priceRange.max}\n` +
            `- Avg: ${stats.priceRange.avg}\n\n` +
            `🆔 ID System:\n` +
            `- Last ID: ${stats.idSystem.lastId}\n` +
            `- Next ID: ${stats.idSystem.nextId}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Start the server using Stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain = process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('upload-excel.js'));
if (isMain) {
  main().catch(console.error);
}