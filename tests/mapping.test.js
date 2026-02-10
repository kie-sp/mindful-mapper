import test from 'node:test';
import assert from 'node:assert';
import { mapRowData } from '../upload-excel.js';

test('Mapping Logic Tests', async (t) => {

    await t.test('Identity Mapping: should return raw row if no mapping provided', () => {
        const row = { 'ID': 1, 'Name': 'Cookie' };
        const result = mapRowData(row, {});
        assert.deepStrictEqual(result, row);
    });

    await t.test('Flat Mapping: should map Excel headers to flat JSON fields', () => {
        const row = { 'Product ID': '123', 'Price Tag': 99 };
        const mapping = {
            'id': 'Product ID',
            'price': 'Price Tag'
        };
        const expected = { id: '123', price: 99 };
        const result = mapRowData(row, mapping);
        assert.deepStrictEqual(result, expected);
    });

    await t.test('Nested Mapping: should map Excel headers to nested JSON objects', () => {
        const row = { 'Name EN': 'Brownie', 'Name FR': 'Petit Gateau' };
        const mapping = {
            'name.en': 'Name EN',
            'name.fr': 'Name FR'
        };
        const expected = {
            name: {
                en: 'Brownie',
                fr: 'Petit Gateau'
            }
        };
        const result = mapRowData(row, mapping);
        assert.deepStrictEqual(result, expected);
    });

    await t.test('Mixed Mapping: should handle both flat and nested fields', () => {
        const row = { 'SKU': 'B01', 'Description': 'Sweet', 'Category': 'Dessert' };
        const mapping = {
            'sku': 'SKU',
            'info.desc': 'Description',
            'info.cat': 'Category'
        };
        const expected = {
            sku: 'B01',
            info: {
                desc: 'Sweet',
                cat: 'Dessert'
            }
        };
        const result = mapRowData(row, mapping);
        assert.deepStrictEqual(result, expected);
    });

});
