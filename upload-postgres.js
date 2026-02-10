#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pg from 'pg';
import XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { mapRowData } from './upload-excel.js';

const { Client } = pg;
dotenv.config();

// PostgreSQL Connection Details
const PG_CONFIG = {
    connectionString: process.env.POSTGRES_URI || 'postgresql://localhost:5432/postgres'
};

let pgClient;

// Create the modern McpServer
const server = new McpServer({
    name: "mindful-mapper-postgres",
    version: "1.0.0",
});

// Tool: Import from Excel to PostgreSQL
server.tool(
    "import_to_postgres",
    "Import data from an Excel file (.xlsx) into a PostgreSQL table. The table must already exist.",
    {
        file_path: z.string().describe("The absolute path to the Excel file"),
        table_name: z.string().describe("The target PostgreSQL table name"),
        column_mapping: z.record(z.string()).describe("Mapping between PostgreSQL columns and Excel headers (e.g., {'first_name': 'First Name'})"),
    },
    async ({ file_path, table_name, column_mapping }) => {
        try {
            if (!fs.existsSync(file_path)) {
                return {
                    content: [{ type: "text", text: `❌ File not found: ${file_path}` }],
                    isError: true
                };
            }

            if (!pgClient) {
                pgClient = new Client(PG_CONFIG);
                await pgClient.connect();
            }

            const workbook = XLSX.readFile(file_path);
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            const items = data.map(row => mapRowData(row, column_mapping));

            for (const item of items) {
                const keys = Object.keys(item);
                const values = Object.values(item);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const sql = `INSERT INTO ${table_name} (${keys.join(', ')}) VALUES (${placeholders})`;
                await pgClient.query(sql, values);
            }

            return {
                content: [{ type: "text", text: `✅ Successfully imported ${items.length} items into PostgreSQL table: ${table_name}!` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `❌ PostgreSQL Error: ${error.message}` }],
                isError: true
            };
        }
    }
);

import { fileURLToPath } from 'url';

// Start the server using Stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

const isMain = process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('upload-postgres.js'));
if (isMain) {
    main().catch(console.error);
}
