import os
import pandas as pd

# Dataset path
dataset_path = r"C:\Users\S.Karthikeyan\OneDrive\Desktop\SKIN\dataset"
csv_path = os.path.join(dataset_path, "HAM10000_metadata.csv")

# Read CSV
df = pd.read_csv(csv_path)

print("=" * 50)
print("Dataset Loaded Successfully!")
print("=" * 50)

print("\nFirst 5 Rows:")
print(df.head())

print("\nDataset Shape:")
print(df.shape)

print("\nColumns:")
print(df.columns)

print("\nDisease Classes:")
print(df['dx'].value_counts())