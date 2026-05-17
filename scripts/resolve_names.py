"""
resolve_names.py

Compares player names in padel_matches.csv against persons.csv.
For any name that doesn't match, suggests close alternatives and
prompts you to resolve it. Writes out corrected CSVs when done.

Usage:
    python scripts/resolve_names.py
"""

import csv
import difflib
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PERSONS_FILE = DATA_DIR / "persons.csv"
MATCHES_FILE = DATA_DIR / "padel_matches.csv"
PLAYER_COLS = ["teammate_left", "teammate_right", "opponent_left", "opponent_right"]


def load_persons() -> tuple[list[str], str]:
    """Returns (list_of_names, header_field_name)."""
    with open(PERSONS_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames[0]
        names = [row[header].strip() for row in reader if row[header].strip()]
    return names, header


def load_matches() -> tuple[list[dict], list[str]]:
    with open(MATCHES_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)
    return rows, fieldnames


def save_persons(names: list[str], header: str) -> None:
    with open(PERSONS_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[header])
        writer.writeheader()
        for name in names:
            writer.writerow({header: name})


def save_matches(rows: list[dict], fieldnames: list[str]) -> None:
    with open(MATCHES_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def find_unknown_names(rows: list[dict], known: set[str]) -> list[str]:
    """Collect unique player names in the match CSV not in the known set."""
    unknown = []
    seen = set()
    for row in rows:
        for col in PLAYER_COLS:
            name = row.get(col, "").strip()
            if name and name.lower() not in known and name not in seen:
                unknown.append(name)
                seen.add(name)
    return unknown


def resolve(unknown_name: str, persons: list[str], known: set[str]) -> str | None:
    """
    Prompt the user to resolve one unknown name.
    Returns the canonical name to use, or None to skip rows with this name.
    """
    suggestions = difflib.get_close_matches(unknown_name, persons, n=4, cutoff=0.5)

    print(f'\n  Unknown: "{unknown_name}"')
    if suggestions:
        print(f"  Close matches: {', '.join(suggestions)}")
    else:
        print("  No close matches found.")

    print("  Options:")
    print(f'    [Enter]          → keep "{unknown_name}" and add to persons.csv')
    print( "    [number]         → pick a suggestion above by number")
    print( "    [existing name]  → map to any other person exactly")
    print( "    skip             → skip all rows containing this name")

    if suggestions:
        for i, s in enumerate(suggestions, 1):
            print(f"      {i}) {s}")

    while True:
        answer = input("  > ").strip()

        if answer == "":
            return unknown_name  # add as new person

        if answer.lower() == "skip":
            return None

        if answer.isdigit():
            idx = int(answer) - 1
            if 0 <= idx < len(suggestions):
                return suggestions[idx]
            print(f"  ✗ Invalid number, pick 1–{len(suggestions)}")
            continue

        if answer.lower() in known:
            # find original-case name
            for p in persons:
                if p.lower() == answer.lower():
                    return p
        else:
            print(f'  ✗ "{answer}" not in persons.csv — try again or type skip')
            continue


def main() -> None:
    persons_list, header = load_persons()
    rows, fieldnames = load_matches()

    known = {p.lower() for p in persons_list}
    unknown = find_unknown_names(rows, known)

    if not unknown:
        print("All player names match persons.csv. Nothing to resolve.")
        return

    print(f"Found {len(unknown)} unmatched name(s) in padel_matches.csv.")

    # name → canonical name (or None = skip)
    resolution: dict[str, str | None] = {}

    for name in unknown:
        canonical = resolve(name, persons_list, known)
        resolution[name] = canonical

        if canonical is not None and canonical.lower() not in known:
            persons_list.append(canonical)
            known.add(canonical.lower())
            print(f'  ✓ Added "{canonical}" to persons list')
        elif canonical is not None:
            print(f'  ✓ Mapped "{name}" → "{canonical}"')

    # Apply resolutions to match rows; mark skipped rows
    skip_names = {name.lower() for name, canon in resolution.items() if canon is None}

    filtered_rows = []
    skipped = 0
    for row in rows:
        skip_row = False
        for col in PLAYER_COLS:
            original = row[col].strip()
            if original in resolution:
                if resolution[original] is None:
                    skip_row = True
                    break
                row[col] = resolution[original]
            elif original.lower() in skip_names:
                skip_row = True
                break
        if skip_row:
            skipped += 1
        else:
            filtered_rows.append(row)

    save_persons(persons_list, header)
    save_matches(filtered_rows, fieldnames)

    print(f"\nDone.")
    print(f"  persons.csv  → {len(persons_list)} persons")
    print(f"  padel_matches.csv → {len(filtered_rows)} rows kept, {skipped} skipped")


if __name__ == "__main__":
    main()
