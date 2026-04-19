import os
import json

# Folders to ignore completely
IGNORE_DIRS = {
    ".git", ".idea", ".vscode", "__pycache__",
    "node_modules", "venv", ".venv", "env", ".env",
    ".mypy_cache", ".pytest_cache", ".tox", ".ruff_cache"
}


def build_tree(path):
    """Recursively build a dict representing the directory structure."""
    name = os.path.basename(path)

    # Skip ignored directories
    if name in IGNORE_DIRS:
        return None

    # If file, return simple node
    if os.path.isfile(path):
        return {"name": name, "type": "file"}

    node = {"name": name, "type": "directory", "children": []}

    # Try reading directory contents
    try:
        entries = os.listdir(path)
    except PermissionError:
        return None  # silently skip unreadable dirs

    for entry in entries:
        full_path = os.path.join(path, entry)
        child = build_tree(full_path)
        if child is not None:   # only add valid nodes
            node["children"].append(child)

    return node


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = script_dir

    tree = build_tree(parent_dir)

    output = os.path.join(script_dir, "parent_dir_structure.json")
    with open(output, "w", encoding="utf-8") as f:
        json.dump(tree, f, indent=2)

    print("Saved directory structure to:", output)


if __name__ == "__main__":
    main()
