# 🧘‍♀️ MindfulMapper

**MindfulMapper** is a gentle, flexible MCP (Model Context Protocol) server designed to make the stressful job of moving data feel a bit more... *zen*. ✨

Whether you're using **MongoDB** or **PostgreSQL**, MindfulMapper helps you flow your Excel data into your database with ease. No more manual data entry headaches—just a smooth, mindful transition.

## ✨ Features

- **🗺️ Flexible Column Mapping**: Map your Excel columns to exactly where they need to go in your database
- **🆔 Auto-Generated IDs**: Create unique IDs with custom prefixes (e.g., `spb-0001`, `spb-0002`)
- **🗄️ Multi-Database Support**: Works with both MongoDB and PostgreSQL
- **📊 Smart Statistics**: View collection/table stats including price analysis and ID tracking
- **🔄 Import/Export**: Bidirectional data flow between Excel and your database
- **🤖 AI-Powered**: Works seamlessly with Claude Desktop via MCP

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB or PostgreSQL database
- Claude Desktop (optional, for AI integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/kie-sp/mindful-mapper.git
cd mindful-mapper

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configuration

Edit `.env` with your database credentials:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=cafe_db
MONGODB_DB_COLLECTION=menu_items

# PostgreSQL Configuration  
POSTGRES_URI=postgresql://user:password@localhost:5432/cafe_db

# ID Generation Settings
ID_PREFIX=spb
```

## 🔧 Usage

### With Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mindful-mapper-mongo": {
      "command": "node",
      "args": ["/absolute/path/to/mindful-mapper/upload-excel.js"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017",
        "MONGODB_DB_NAME": "cafe_db",
        "ID_PREFIX": "spb"
      }
    }
  }
}
```

Then restart Claude Desktop and chat naturally:

**Example conversations:**

```
You: "Import /path/to/menu.xlsx into the menu_items collection. 
Map columns like this:
- 'Name (EN)' → 'name.en'
- 'Name (TH)' → 'name.th'
- 'Type' → 'type'
- 'Price' → 'price'
Use 'spb' as the ID prefix"

Claude: ✅ Successfully imported 7 items into collection: menu_items!
🆔 Generated IDs: spb-0001, spb-0002, spb-0003, spb-0004, spb-0005, spb-0006, spb-0007
```

```
You: "Show me the stats for my menu_items collection"

Claude: 📊 Collection Stats: menu_items

Total Items: 7

Price Analysis:
- Min: 60
- Max: 85
- Avg: 69.71

🆔 ID System:
- Last ID: spb-0007
- Next ID: spb-0008
```

### Excel File Format

Your Excel file should have headers in the first row:

| Name (EN) | Name (TH) | Type | Price | Description (EN) |
|-----------|-----------|------|-------|------------------|
| Americano | อเมริกาโน่ | drink | 65 | Medium Roast |
| Butter Cookie | คุกกี้เนย | cookie | 60 | Classic butter |

### Available Tools

#### MongoDB (`upload-excel.js`)

1. **`import_from_excel`**
   - Import Excel data with flexible column mapping
   - Auto-generate unique IDs
   - Option to clear existing data
   
2. **`export_to_excel`**
   - Export MongoDB collection to Excel
   - Preserves data structure
   
3. **`view_stats`**
   - View collection statistics
   - Track ID generation
   - Analyze price ranges

#### PostgreSQL (`upload-postgres.js`)

1. **`import_to_postgres`**
   - Import Excel data to PostgreSQL tables
   - Dynamic column mapping
   - Table must exist beforehand

## 📁 Project Structure

```
mindful-mapper/
├── upload-excel.js       # MongoDB MCP server
├── upload-postgres.js    # PostgreSQL MCP server
├── tests/
│   └── mapping.test.js   # Unit tests for mapping logic
├── package.json
├── .env.example          # Example environment variables
└── README.md
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 🌟 Column Mapping Examples

### Simple Mapping
```javascript
{
  "name": "Product Name",
  "price": "Price"
}
```

### Nested Object Mapping
```javascript
{
  "name.en": "Name (EN)",
  "name.th": "Name (TH)",
  "description.en": "Description (EN)",
  "description.th": "Description (TH)"
}
```

Result:
```json
{
  "id": "spb-0001",
  "name": {
    "en": "Americano",
    "th": "อเมริกาโน่"
  },
  "description": {
    "en": "Medium Roast",
    "th": "คั่วกลาง"
  }
}
```

## 🔒 Best Practices

- **Backup first**: Always export your collection before clearing data
- **Test mappings**: Start with a small Excel file to verify column mapping
- **Consistent prefixes**: Use the same ID prefix across your application
- **Environment variables**: Never commit `.env` files to version control

## 💡 Pro Tips for a Zen Workflow

- **Example File**: Check out the `examples/` folder in this repository to see the ideal structure for your data.
- **Adding New Products**: 
    - **Batch Method**: Create a new Excel file for each new batch of products (e.g., `delivery_feb_10.xlsx`). This keeps your imports organized by event.
    - **Master List Method**: Keep one master Excel file and simply add new rows at the bottom. MindfulMapper will pick up the new items (just ensure `clear_existing` is `false` to avoid overwriting!).
- **Flexible Mapping**: If your supplier changes their Excel format, don't worry! Just update the `column_mapping` in your request to Claude.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## ✍️ Author

**Kie SP** - [GitHub](https://github.com/kie-sp)

## 📄 License

MIT - Feel free to share the peace!

## 🙏 Acknowledgments

Built with love using:
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [MongoDB](https://www.mongodb.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [SheetJS](https://sheetjs.com/)

---

*Made with mindfulness ✨*
