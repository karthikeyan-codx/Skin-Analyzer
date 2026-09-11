import os
import cv2
import pandas as pd
import matplotlib.pyplot as plt

# Dataset path
dataset_path = "dataset"

# Read metadata
df = pd.read_csv(os.path.join(dataset_path, "HAM10000_metadata.csv"))

# Image folders
folder1 = os.path.join(dataset_path, "HAM10000_images_part_1")
folder2 = os.path.join(dataset_path, "HAM10000_images_part_2")

# Take first image
image_id = df.iloc[0]["image_id"]

# Find image
image_path = os.path.join(folder1, image_id + ".jpg")

if not os.path.exists(image_path):
    image_path = os.path.join(folder2, image_id + ".jpg")

# Read image
image = cv2.imread(image_path)

# Convert BGR to RGB
image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# Display
plt.imshow(image)
plt.title(df.iloc[0]["dx"])
plt.axis("off")
plt.show()