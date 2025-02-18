class UnionFind {
    constructor(size) {
        this.parent = new Array(size);
        this.rank = new Array(size);
        this.count = size;

        for (let i = 0; i < size; i++) {
            this.parent[i] = i;
            this.rank[i] = 0;
        }
    }

    find(p) {
        if (this.parent[p] !== p) {
            this.parent[p] = this.find(this.parent[p]); // Path compression
        }
        return this.parent[p];
    }

    union(p, q) {
        let rootP = this.find(p);
        let rootQ = this.find(q);

        if (rootP === rootQ) return false;

        // Union by rank
        if (this.rank[rootP] < this.rank[rootQ]) {
            this.parent[rootP] = rootQ;
        } else if (this.rank[rootP] > this.rank[rootQ]) {
            this.parent[rootQ] = rootP;
        } else {
            this.parent[rootQ] = rootP;
            this.rank[rootP]++;
        }

        this.count--;
        return true;
    }

    connected(p, q) {
        return this.find(p) === this.find(q);
    }

    getCount() {
        return this.count;
    }
}

export { UnionFind };
