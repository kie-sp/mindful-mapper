#!/bin/bash
export DOTENV_CONFIG_SILENT=true
export NODE_ENV=production
node upload-excel.js 2>/dev/null
