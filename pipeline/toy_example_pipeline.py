import numpy as np
import pandas as pd
import umap.umap_ as umap
from sklearn.preprocessing import StandardScaler
import igraph as ig
import leidenalg
import matplotlib.pyplot as plt

def generate_synthetic_data():
    np.random.seed(42)
    data_cluster1 = np.random.poisson(100, (12, 50))
    data_cluster2 = np.random.poisson(150, (12, 50))
    data = np.vstack([data_cluster1, data_cluster2])
    genes = [f"Gene_{i}" for i in range(1, 51)]
    cells = [f"Cell_{i}" for i in range(1, 25)]
    matrix = pd.DataFrame(data, index=cells, columns=genes)
    matrix.to_csv("sparse_gene_count_matrix.csv")
    print("Data creation complete and file saved.")
    return matrix

def load_data(filepath):
    return pd.read_csv(filepath, index_col=0)

def standardize_data(matrix):
    scaler = StandardScaler()
    return scaler.fit_transform(matrix)

def reduce_dimensionality(matrix_scaled, n_neighbors):
    reducer = umap.UMAP(n_neighbors=n_neighbors, random_state=42)
    embedding = reducer.fit_transform(matrix_scaled)
    return embedding, reducer

def create_igraph(reducer):
    sources, targets = reducer.graph_.tocoo().nonzero()
    weights = reducer.graph_[sources, targets].A1
    g = ig.Graph(list(zip(sources, targets)), directed=True)
    g.es["weight"] = [max(w, 0) for w in weights]
    return g

def leiden_clustering(graph, resolution):
    partition = leidenalg.find_partition(
        graph, leidenalg.RBConfigurationVertexPartition, 
        resolution_parameter=resolution, weights="weight"
    )
    return np.array(partition.membership)

def plot_embedding(embedding, clusters):
    colors = ["grey" for _ in clusters]
    plt.figure(figsize=(8, 8))
    plt.scatter(embedding[:, 0], embedding[:, 1], s=80, c=colors)
    plt.title("UMAP projection of the dataset")
    plt.xlabel("UMAP 1")
    plt.ylabel("UMAP 2")
    plt.show()

def main():
    # Step 1: Generate synthetic data
    matrix = generate_synthetic_data()

    # Step 2: Load the data
    matrix = load_data("./sparse_gene_count_matrix.csv")

    # Step 3: Standardize the data
    matrix_scaled = standardize_data(matrix)

    # Step 4: Reduce dimensionality with UMAP
    n_neighbors = min(matrix_scaled.shape[0] - 1, 15)
    embedding, reducer = reduce_dimensionality(matrix_scaled, n_neighbors)

    # Step 5: Create igraph
    graph = create_igraph(reducer)

    # Step 6: Perform Leiden clustering with varying resolution
    for resolution in [0.1, 0.5, 1.0, 2.0]:
        clusters = leiden_clustering(graph, resolution)
        print(f"Resolution: {resolution}, Number of clusters: {len(set(clusters))}")
        plot_embedding(embedding, clusters)
        

if __name__ == "__main__":
    main()