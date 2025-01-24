# JSON to Table Converter

A modern web application that allows users to convert JSON data into a beautiful, interactive table format. The application provides an intuitive interface for users to paste or upload JSON data and instantly see it transformed into a well-formatted table.

## Features

- Paste or upload JSON data
- Automatic table generation with column headers
- Support for nested JSON structures
- Interactive table with sorting and filtering capabilities
- Responsive design for mobile and desktop
- Copy table to clipboard in various formats (CSV, Markdown)
- Error handling and validation for JSON input

## Tech Stack

- Frontend:
  - HTML5
  - CSS3 (with Tailwind CSS for styling)
  - JavaScript (Vanilla JS)
- Backend:
  - Python
  - Flask (Web framework)

## Project Structure

```
JsonToTable/
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── templates/
│   └── index.html
├── app.py
├── requirements.txt
└── README.md
```

## Setup and Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Access the web application through your browser
2. Paste your JSON data into the input area or upload a JSON file
3. Click "Convert" to transform your JSON into a table
4. Use the table controls to sort, filter, or export your data

## Dependencies

- Flask==3.0.0
- tailwindcss==3.4.1