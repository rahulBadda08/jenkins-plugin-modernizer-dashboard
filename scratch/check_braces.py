import os

target_path = os.path.join(os.path.dirname(__file__), "..", "src", "Dashboard.tsx")

with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

stack = []
for i, char in enumerate(content):
    if char == "{":
        stack.append(i)
    elif char == "}":
        if not stack:
            print(f"Extra '}}' at index {i}")
        else:
            stack.pop()

if stack:
    for pos in stack:
        line_no = content[:pos].count("\n") + 1
        print(f"Unclosed '{{' at line {line_no}")
else:
    print("Braces are balanced")
