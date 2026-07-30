"""
Example: PrismNote MCP 2.0 SQL Queries

Shows how to enable MCP for AI-native SQL query discovery
"""

import logging
import time

from prismnote import NotebookConnector

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def main():
    """Basic MCP SQL query example"""

    logger.info("=" * 60)
    logger.info("PrismNote MCP 2.0 SQL Query Example")
    logger.info("=" * 60)

    # 1. Create connector
    logger.info("\n1. Creating NotebookConnector...")
    connector = NotebookConnector()

    # 2. Add databases
    logger.info("\n2. Adding databases...")
    connector.add_database(
        name="warehouse",
        dialect="postgresql",
        url="postgresql://localhost/warehouse",
    )
    logger.info("  ✓ Added warehouse (PostgreSQL)")

    connector.add_database(
        name="analytics",
        dialect="snowflake",
        url="snowflake://my-org/analytics",
    )
    logger.info("  ✓ Added analytics (Snowflake)")

    # 3. List databases
    logger.info("\n3. Available databases:")
    databases = connector.list_databases()
    for db in databases:
        logger.info(f"  - {db['name']} ({db['dialect']})")

    # 4. Enable MCP
    logger.info("\n4. Starting MCP connector...")
    try:
        endpoint = connector.start_mcp_connector(port=8765)
        logger.info(f"✓ MCP endpoint ready: {endpoint}")
    except Exception as e:
        logger.error(f"Failed to start MCP: {e}")
        logger.info(
            "\nNote: DAB (Data API Builder) must be installed:"
        )
        logger.info("  dotnet tool install -g Microsoft.DataApiBuilder")
        return

    # 5. Show available tools
    logger.info("\n5. MCP Tools Available:")
    tools = [
        "query_database",
        "get_database_schema",
        "list_databases",
        "validate_sql_syntax",
        "estimate_query_cost",
        "inspect_data_file",
        "get_table_statistics",
        "export_query_results",
        "optimize_sql_query",
        "detect_data_quality_issues",
        "list_notebooks",
    ]
    for i, tool in enumerate(tools, 1):
        logger.info(f"  {i}. {tool}")

    # 6. Validate SQL
    logger.info("\n6. Validating SQL...")
    validation = connector.validate_sql(
        query="SELECT * FROM users WHERE id > 10"
    )
    logger.info(f"  Valid: {validation['valid']}")
    if validation['suggestions']:
        logger.info(f"  Suggestions: {validation['suggestions']}")

    # 7. Estimate cost (BigQuery example)
    logger.info("\n7. Estimating query cost...")
    estimate = connector.estimate_cost(
        database="analytics",
        query="SELECT COUNT(*) FROM large_table",
    )
    logger.info(f"  Estimated cost: ${estimate['cost']:.2f}")
    logger.info(f"  Rows: {estimate['rows']:,}")
    logger.info(f"  Bytes: {estimate['bytes'] / (1024*1024):.1f} MB")

    # 8. Get schema
    logger.info("\n8. Discovering schema...")
    schema = connector.get_schema(database="warehouse")
    logger.info(f"  Schemas: {len(schema['schemas'])}")
    logger.info(f"  Tables: {len(schema['tables'])}")
    for table in schema['tables'][:3]:
        logger.info(f"    - {table['name']} ({table['rows']:,} rows)")

    # 9. Claude can now query
    logger.info("\n9. Claude Can Now:")
    logger.info('  • "Show me the top 10 customers by revenue"')
    logger.info('  • "Estimate the cost of this BigQuery query"')
    logger.info('  • "What columns exist in the users table?"')
    logger.info('  • "Find tables with PII data"')
    logger.info('  • "Export these results as Parquet"')
    logger.info('  • "Optimize this slow query"')

    logger.info("\n   MCP is running! Press Ctrl+C to stop...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("\n\nStopping MCP connector...")
        connector.stop_mcp_connector()
        logger.info("✓ MCP connector stopped")


if __name__ == "__main__":
    main()
