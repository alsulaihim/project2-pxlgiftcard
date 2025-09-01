# CSV Product Import Guide

## Overview
This guide explains the CSV format for importing gift card products into the PXL Giftcard Platform.

## CSV Format Specification

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `brand` | string | Brand name of the gift card | Amazon |
| `name` | string | Full product name | Amazon Gift Card |
| `description` | string | Product description | Shop millions of items on Amazon |
| `category` | string | Product category | shopping |
| `featured` | boolean | Whether product is featured | true |
| `status` | string | Product status | active |
| `artwork` | string | Artwork identifier | amazon-classic |
| `denominations` | string | Denomination data (see format below) | See below |
| `totalSold` | number | Total units sold | 342 |
| `createdAt` | ISO 8601 | Creation timestamp | 2024-01-15T10:00:00Z |

### Categories
Available categories:
- `shopping`
- `technology`
- `food`
- `entertainment`
- `transportation`
- `gaming`
- `fashion`
- `beauty`
- `home`
- `health`
- `travel`
- `payment`
- `outdoor`
- `sports`

### Status Values
- `active` - Product is available for purchase
- `inactive` - Product is temporarily unavailable
- `out_of_stock` - Product has no inventory

### Denominations Format
The denominations field uses a special format to encode multiple denominations with their quantities and serial numbers:

```
value:quantity:serialRange|value:quantity:serialRange|...
```

#### Format Breakdown:
- `value`: The denomination amount (e.g., 10, 25, 50, 100)
- `quantity`: Number of available cards for this denomination
- `serialRange`: Range of serial numbers (START-END format)
- `|`: Separator between different denominations

#### Example:
```
10:15:AMZN10XXX001-AMZN10XXX015|25:20:AMZN25XXX001-AMZN25XXX020|50:25:AMZN50XXX001-AMZN50XXX025
```

This creates:
- $10 cards: 15 available (serials AMZN10XXX001 to AMZN10XXX015)
- $25 cards: 20 available (serials AMZN25XXX001 to AMZN25XXX020)
- $50 cards: 25 available (serials AMZN50XXX001 to AMZN50XXX025)

### Serial Number Format
Recommended format: `BRAND + VALUE + XXX + NUMBER`
- Example: `AMZN50XXX001` = Amazon $50 card #001

## Import Process

### Via Admin Panel
1. Navigate to `/admin/products`
2. Click "Import CSV"
3. Select your CSV file
4. Review the preview
5. Click "Import Products"

### Via Script
```bash
node scripts/import-products.js data/sample-products-import.csv
```

## Sample Data

The file `sample-products-import.csv` contains 50 pre-configured products with:
- Popular brands (Amazon, Apple, Netflix, etc.)
- Various categories
- Multiple denominations per product
- Realistic inventory quantities
- Sample serial number ranges

## Best Practices

1. **Serial Numbers**: Use unique prefixes for each brand to avoid conflicts
2. **Quantities**: Start with smaller quantities for testing
3. **Denominations**: Include common values ($10, $25, $50, $100)
4. **Artwork**: Ensure artwork identifiers match existing artwork in the system
5. **Timestamps**: Use ISO 8601 format for dates

## Validation Rules

The import process validates:
- Required fields are present
- Categories are valid
- Status values are correct
- Denominations format is valid
- Serial number ranges don't overlap
- Timestamps are properly formatted

## Error Handling

Common errors and solutions:
- **Invalid category**: Check against the allowed categories list
- **Duplicate serials**: Ensure serial ranges don't overlap
- **Missing artwork**: Add artwork via Admin > Artwork first
- **Invalid denomination format**: Follow the `value:quantity:range` format

## Testing Recommendations

1. Start with a small subset (5-10 products) for initial testing
2. Verify products appear correctly in the marketplace
3. Test purchasing different denominations
4. Check inventory tracking works properly
5. Validate serial number assignment on purchase

## Support

For issues or questions about CSV imports:
- Check the import logs in `/admin/products`
- Review Firebase console for detailed errors
- Contact system administrator for bulk imports