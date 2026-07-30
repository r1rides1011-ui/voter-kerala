import requests
import json

DB_URL = "https://winward-6032c-default-rtdb.firebaseio.com/.json"

def get_all_data(url):
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()

def print_nodes(d, prefix=""):
    if isinstance(d, dict):
        for key, value in d.items():
            path = f"{prefix}/{key}"
            print(path)
            print_nodes(value, path)

def main():
    data = get_all_data(DB_URL)
    print("Top-level nodes:")
    for k in data.keys():
        print("-", k)

    # Uncomment below to list all nodes recursively (WARNING: can be huge)
    # print("\nFull structure:")
    # print_nodes(data)

if __name__ == "__main__":
    main()
