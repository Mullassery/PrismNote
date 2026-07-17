"""
PrismNote Basic Example: Data Analysis Workflow

This example shows how to:
1. Load a CSV file
2. Explore data visually
3. Run basic statistics
4. Create charts
"""

from prismnote import Notebook
import pandas as pd

# Create a new notebook
notebook = Notebook("customer_analysis")

# Load data
df = pd.read_csv("sample_data.csv")
notebook.display(df.head())

# Quick statistics
notebook.display(f"Shape: {df.shape}")
notebook.display(f"Missing values:\n{df.isnull().sum()}")

# Data quality checks
notebook.run_quality_checks(df)

# Create visualizations
notebook.plot.histogram(df["revenue"], bins=20, title="Revenue Distribution")
notebook.plot.scatter(df["spend"], df["revenue"], title="Spend vs Revenue")

# Export results
notebook.export("analysis_report.html")
