from flask import Flask, render_template, request, jsonify, send_file
import json
import csv
from io import StringIO, BytesIO
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter
import pandas as pd

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        data = request.get_json()
        print("Received data:", json.dumps(data, indent=2))
        
        if not data or 'insights' not in data:
            print("No valid insights data found")
            return jsonify({'error': 'No valid insights data provided'}), 400
        
        insights = data['insights']
        print(f"Processing {len(insights)} insights")
        processed_insights = []
        
        for i, insight in enumerate(insights):
            print(f"Processing insight {i + 1}")
            processed_facts = {}
            if 'facts' in insight:
                for fact_name, fact_data in insight['facts'].items():
                    print(f"Processing fact: {fact_name}")
                    if isinstance(fact_data, dict) and 'cols' in fact_data and 'rows' in fact_data:
                        processed_facts[fact_name] = {
                            'headers': fact_data['cols'],
                            'rows': fact_data['rows'],
                            'type': fact_data.get('type', ''),
                            'attributesTypes': fact_data.get('attributesTypes', [])
                        }
            
            processed_insight = {
                'id': insight.get('id', ''),
                'insightId': insight.get('insightId', ''),
                'useCaseId': insight.get('useCaseId', ''),
                'segment': insight.get('segment', ''),
                'generatedDate': insight.get('generatedDate', ''),
                'score': insight.get('score', ''),
                'status': insight.get('status', ''),
                'type': insight.get('type', ''),
                'facts': processed_facts
            }
            print(f"Processed insight: {json.dumps(processed_insight, indent=2)}")
            processed_insights.append(processed_insight)

        result = {
            'requestId': data.get('requestId', ''),
            'insights': processed_insights
        }
        print(f"Returning {len(processed_insights)} insights")
        return jsonify(result)
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON format'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return app.send_from_directory('static', 'favicon.ico')

@app.route('/download', methods=['POST'])
def download_excel():
    try:
        request_data = request.get_json()
        if not request_data or 'data' not in request_data:
            return jsonify({'error': 'No data provided'}), 400
            
        data = request_data['data']
        filename = request_data.get('filename', 'insights.xlsx')
        
        # Ensure filename has .xlsx extension
        if not filename.lower().endswith('.xlsx'):
            filename += '.xlsx'

        # Create Excel file in memory
        output = BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')
        
        # Process each insight
        for i, insight in enumerate(data.get('insights', [])):
            facts = insight.get('facts', {})
            for fact_name, fact_data in facts.items():
                if isinstance(fact_data, dict) and 'cols' in fact_data and 'rows' in fact_data:
                    # Create DataFrame from fact data
                    df = pd.DataFrame(fact_data['rows'], columns=fact_data['cols'])
                    
                    # Try to convert date columns and sort
                    date_columns = []
                    for col in df.columns:
                        # Check if column name contains date-related keywords
                        if any(date_word in col.lower() for date_word in ['date', 'time', 'day']):
                            try:
                                # Try to convert to datetime
                                df[col] = pd.to_datetime(df[col])
                                date_columns.append(col)
                            except:
                                continue
                    
                    # Sort by the first date column found if any exist
                    if date_columns:
                        df = df.sort_values(by=date_columns[0])
                    
                    # Create sheet name from insight and fact name
                    sheet_name = f"{insight.get('useCaseId', f'Insight{i+1}')}_{fact_name}"[:31]
                    
                    # Write DataFrame to Excel sheet
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    
                    # Get the worksheet
                    worksheet = writer.sheets[sheet_name]
                    
                    # Format date columns
                    for col_idx, col_name in enumerate(df.columns):
                        if col_name in date_columns:
                            # Format date cells
                            for row in range(2, len(df) + 2):  # Start from row 2 to skip header
                                cell = worksheet.cell(row=row, column=col_idx + 1)
                                cell.number_format = 'YYYY-MM-DD'
        
        writer.close()
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Development only
    app.run(host='0.0.0.0', port=10000)
