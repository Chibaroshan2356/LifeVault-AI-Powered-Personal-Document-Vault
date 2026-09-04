# Import typing constructs for backward-compatible type hints on python versions older than 3.9
from typing import List, Dict, Any, Tuple
# Import the json library to enable loading and writing of JSON data structures
import json
# Import the os library to handle directory creations and checking file existences
import os
# Import the sys library to extract command-line arguments and handle encoding configuration
import sys

# Define a helper function to safely print unicode characters to console without throwing encoding errors
def safe_print(msg: str) -> None:
    # Attempt to print the message directly to console
    try:
        # Execute the standard print statement
        print(msg)
    # Catch any encoding exceptions that might arise on older consoles or custom shells
    except UnicodeEncodeError:
        # Encode the message using the standard output encoding, replacing unmappable characters, and decode it back
        encoded_msg = msg.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        # Print the cleaned representation to avoid crashing execution
        print(encoded_msg)

# Define a function to load a FUNSD annotation JSON file from a given file path
def load_funsd_json(file_path: str) -> Dict[str, Any]:
    # Check if the target file actually exists on the disk space
    if not os.path.exists(file_path):
        # Raise an explicit error if the file cannot be located
        raise FileNotFoundError(f"Annotation file not found: {file_path}")
    
    # Open the file safely in read-only mode with UTF-8 character encoding
    with open(file_path, 'r', encoding='utf-8') as file:
        # Load the file content into a Python dictionary structure
        data = json.load(file)
        # Return the parsed dictionary back to the caller
        return data

# Define a function to parse, analyze, display, and export a FUNSD document annotation
def parse_and_display_funsd(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Retrieve the list of elements under the key 'form', defaulting to an empty list
    form_elements: List[Dict[str, Any]] = data.get("form", [])
    
    # Verify if the form elements list is empty
    if not form_elements:
        # Print a warning message to inform the user that nothing was found
        safe_print("Warning: No 'form' key or elements found in the JSON file.")
        # Return an empty list as there is nothing to analyze or display
        return []
        
    # Print a top border line for the document header
    safe_print("=" * 80)
    # Print the title of the document layout details
    safe_print("FUNSD DOCUMENT ANNOTATION DETAILS")
    # Print a middle separator line for visual spacing
    safe_print("=" * 80)
    # Print the total number of semantic entities discovered in the file
    safe_print(f"Total entities: {len(form_elements)}")
    # Print a bottom border line for the header
    safe_print("=" * 80)
    
    # Initialize a list to hold cleaned and formatted entity objects for exporting
    cleaned_entities: List[Dict[str, Any]] = []
    
    # Loop through each entity dictionary within the form elements list
    for entity in form_elements:
        # Extract the unique numeric identifier of the current entity, defaulting to -1
        entity_id: int = entity.get("id", -1)
        # Extract the full OCR text string of the entity, defaulting to an empty string
        text: str = entity.get("text", "")
        # Extract the semantic label of the entity, defaulting to 'other'
        label: str = entity.get("label", "other")
        # Extract the layout coordinates of the entity, defaulting to an empty list
        box: List[int] = entity.get("box", [])
        # Extract the constituent words list of dictionaries, defaulting to an empty list
        words: List[Dict[str, Any]] = entity.get("words", [])
        # Extract the semantic links list of coordinate pairs, defaulting to an empty list
        linking: List[List[int]] = entity.get("linking", [])
        
        # Display the entity id block header
        safe_print(f"\n[Entity ID]: {entity_id}")
        # Display the text content of the entity block
        safe_print(f"  Text       : \"{text}\"")
        # Display the uppercase version of the semantic label
        safe_print(f"  Label      : {label.upper()}")
        
        # Display the coordinates section title
        safe_print("  Box (Coordinates):")
        # Check if the bounding box list contains exactly four values
        if len(box) == 4:
            # Print the top-left x coordinate
            safe_print(f"    x1 = {box[0]}")
            # Print the top-left y coordinate
            safe_print(f"    y1 = {box[1]}")
            # Print the bottom-right x coordinate
            safe_print(f"    x2 = {box[2]}")
            # Print the bottom-right y coordinate
            safe_print(f"    y2 = {box[3]}")
        # Otherwise if coordinates are invalid or empty
        else:
            # Print a message stating coordinates are unavailable
            safe_print("    N/A")
            
        # Display the individual words section header
        safe_print("  Words      :")
        # Initialize an empty list to store word information for exporting
        cleaned_words: List[Dict[str, Any]] = []
        # Loop through each word dictionary in the words list with index counter
        for word_index, word_item in enumerate(words):
            # Extract the text string of the current word
            word_text: str = word_item.get("text", "")
            # Extract the bounding box coordinates of the current word
            word_box: List[int] = word_item.get("box", [])
            # Print the word index and its text representation
            safe_print(f"    - Word {word_index + 1}: '{word_text}'")
            # Check if the word bounding box contains exactly four coordinates
            if len(word_box) == 4:
                # Print the word's coordinates on a single line for compactness
                safe_print(f"      Box: x1={word_box[0]}, y1={word_box[1]}, x2={word_box[2]}, y2={word_box[3]}")
                # Add the word structure to the export list
                cleaned_words.append({
                    "text": word_text,
                    "box": {"x1": word_box[0], "y1": word_box[1], "x2": word_box[2], "y2": word_box[3]}
                })
            # If coordinates are not standard length
            else:
                # Add word text and empty coordinates to export list
                cleaned_words.append({
                    "text": word_text,
                    "box": {}
                })
            
        # Initialize a list to hold links related to this entity ID
        linked_ids: List[int] = []
        # Iterate over each link represented as a pair list of entity IDs
        for link in linking:
            # If this entity ID matches the first element in the link pair
            if link[0] == entity_id:
                # Add the linked target element to the list
                linked_ids.append(link[1])
            # Else if this entity ID matches the second element in the link pair
            elif link[1] == entity_id:
                # Add the linked source element to the list
                linked_ids.append(link[0])
                
        # Deduplicate linked IDs while preserving their original order of insertion
        unique_links = list(dict.fromkeys(linked_ids))
        # Print the list of related entity IDs or None
        safe_print(f"  Linked Entities: {unique_links if unique_links else 'None'}")
        # Print a dividing line between different entities for layout clarity
        safe_print("-" * 80)
        
        # Append the cleaned, structured entity dictionary to the export list
        cleaned_entities.append({
            "id": entity_id,
            "text": text,
            "label": label.lower(),
            "box": {"x1": box[0], "y1": box[1], "x2": box[2], "y2": box[3]} if len(box) == 4 else {},
            "words": cleaned_words,
            "linked_entities": unique_links
        })
        
    # Print the summary statistics section header
    safe_print("\nSummary")
    # Print the total number of entities counted
    safe_print(f"Total entities : {len(form_elements)}")
    # Count how many entities have the label 'question'
    questions = sum(1 for e in form_elements if e.get("label") == "question")
    # Count how many entities have the label 'answer'
    answers = sum(1 for e in form_elements if e.get("label") == "answer")
    # Count how many entities have the label 'header'
    headers = sum(1 for e in form_elements if e.get("label") == "header")
    # Count how many entities have the label 'other'
    others = sum(1 for e in form_elements if e.get("label") == "other")
    
    # Print the count of questions
    safe_print(f"Questions      : {questions}")
    # Print the count of answers
    safe_print(f"Answers        : {answers}")
    # Print the count of headers
    safe_print(f"Headers        : {headers}")
    # Print the count of other text elements
    safe_print(f"Others         : {others}")
    
    # Return the cleaned entities list back to the main block
    return cleaned_entities

# Run script when invoked directly from shell command line
if __name__ == "__main__":
    # Attempt to reconfigure stdout to use UTF-8 encoding in order to handle diverse characters
    try:
        # Reconfigure sys.stdout encoding
        sys.stdout.reconfigure(encoding='utf-8')
    # Catch any AttributeErrors if running in environments where reconfigure is unsupported
    except AttributeError:
        # Pass silently as fallback mechanisms will manage output encoding
        pass

    # Define a default path to the real dataset json file from the FUNSD set
    default_sample_path = "dataset/training_data/annotations/00040534.json"
    
    # Check if custom argument is provided via sys argv
    if len(sys.argv) > 1:
        # Use the file path specified by the user
        json_file_path = sys.argv[1]
    # Otherwise if no path was provided
    else:
        # Determine script root directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Determine repository root directory
        repo_root = os.path.dirname(script_dir)
        # Compute the absolute default path to the annotation file
        json_file_path = os.path.join(repo_root, default_sample_path)
        
    # Print the target annotation file name being parsed
    safe_print(f"Loading and parsing annotation file: {json_file_path}")
    
    # Wrap block in a try-except to gracefully log errors
    try:
        # Load JSON dictionary data
        parsed_data = load_funsd_json(json_file_path)
        # Parse and print entity boxes and obtain the cleaned output structures
        cleaned_output = parse_and_display_funsd(parsed_data)
        
        # Define output directory path
        output_dir = "outputs"
        # Define output destination file path
        output_file = os.path.join(output_dir, "parsed_document.json")
        # Create output directories if they do not exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Open destination file in write mode with UTF-8 encoding
        with open(output_file, 'w', encoding='utf-8') as f:
            # Serialize cleaned output to JSON format with indentation
            json.dump(cleaned_output, f, ensure_ascii=False, indent=2)
            
        # Print confirmation of the saved file
        safe_print(f"\nSaved cleaned parsed version to: {output_file}")
        
    # Handle files missing errors
    except FileNotFoundError as fnf_error:
        # Print error details
        safe_print(f"Error: {fnf_error}")
        # Exit with error code
        sys.exit(1)
    # Handle all other runtime errors
    except Exception as general_error:
        # Print error message details
        safe_print(f"An error occurred while parsing the JSON file: {general_error}")
        # Exit with failure code
        sys.exit(1)
