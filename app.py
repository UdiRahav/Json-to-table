from flask import Flask, render_template, request, jsonify, send_file
import json
import csv
from io import StringIO, BytesIO
import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        data = request.get_json()
        if not data or 'insights' not in data:
            return jsonify({'error': 'No valid insights data provided'}), 400
        
        insights = data['insights']
        processed_insights = []
        
        for insight in insights:
            processed_facts = {}
            if 'facts' in insight:
                for fact_name, fact_data in insight['facts'].items():
                    if isinstance(fact_data, dict) and 'cols' in fact_data and 'rows' in fact_data:
                        processed_facts[fact_name] = {
                            'headers': fact_data['cols'],
                            'rows': fact_data['rows'],
                            'type': fact_data.get('type', ''),
                            'attributesTypes': fact_data.get('attributesTypes', [])
                        }
            
            processed_insights.append({
                'id': insight.get('id', ''),
                'insightId': insight.get('insightId', ''),
                'useCaseId': insight.get('useCaseId', ''),
                'segment': insight.get('segment', ''),
                'generatedDate': insight.get('generatedDate', ''),
                'score': insight.get('score', ''),
                'status': insight.get('status', ''),
                'type': insight.get('type', ''),
                'facts': processed_facts
            })

        return jsonify({
            'requestId': data.get('requestId', ''),
            'insights': processed_insights
        })
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON format'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return app.send_from_directory('static', 'favicon.ico')

@app.route('/download-csv', methods=['POST'])
def download_csv():
    try:
        print("Received download request")
        if not request.is_json:
            raise ValueError("Request must be JSON")
            
        data = request.get_json()
        print("Received data:", data)
        
        if not data:
            raise ValueError("No data received")
            
        insights = data.get('insights', [])
        if not insights:
            raise ValueError("No insights found in data")
            
        request_id = data.get('requestId', 'export')
        print(f"Processing {len(insights)} insights")

        # Create an Excel workbook
        workbook = openpyxl.Workbook()
        
        # Create a sheet for each insight
        for idx, insight in enumerate(insights):
            print(f"Processing insight {idx + 1}/{len(insights)}")
            
            # Validate insight data
            if not isinstance(insight, dict):
                print(f"Warning: Invalid insight format at index {idx}")
                continue
                
            # Create a sheet with a valid name using useCase (max 31 chars, no special chars)
            sheet_name = f"UseCase_{idx + 1}"
            if 'useCaseId' in insight and insight['useCaseId']:
                sheet_name = str(insight['useCaseId'])
            sheet_name = "".join(c for c in sheet_name if c.isalnum() or c in ('_', '-'))[-31:]
            
            sheet = workbook.create_sheet(sheet_name)

            # Add insight details in a table format
            sheet.append(['Insight Details'])
            details_table = [
                ['Field', 'Value'],
                ['ID', str(insight.get('id', ''))],
                ['Use Case', str(insight.get('useCaseId', ''))],
                ['Type', str(insight.get('type', ''))],
                ['Segment', str(insight.get('segment', ''))],
                ['Score', str(insight.get('score', ''))],
                ['Status', str(insight.get('status', ''))],
                ['Generated Date', str(insight.get('generatedDate', ''))]
            ]

            # Style the details table
            for row_idx, row in enumerate(details_table):
                sheet.append(row)
                for col_idx, value in enumerate(row):
                    cell = sheet.cell(row=sheet.max_row, column=col_idx + 1)
                    cell.border = Border(
                        left=Side(style='thin'),
                        right=Side(style='thin'),
                        top=Side(style='thin'),
                        bottom=Side(style='thin')
                    )
                    if row_idx == 0:  # Header row
                        cell.font = Font(bold=True)
                        cell.fill = PatternFill(start_color='E0E0E0', end_color='E0E0E0', fill_type='solid')

            sheet.append([])  # Empty row for spacing

            # Add facts
            facts = insight.get('facts', {})
            if not isinstance(facts, dict):
                print(f"Warning: Invalid facts format in insight {idx}")
                continue
                
            for fact_name, fact_data in facts.items():
                print(f"Processing fact: {fact_name}")
                if not isinstance(fact_data, dict):
                    print(f"Warning: Invalid fact data format for {fact_name}")
                    continue
                    
                # Add fact header
                sheet.append([f'Fact: {fact_name}'])
                sheet.append(['Type:', str(fact_data.get('type', ''))])
                sheet.append([])  # Empty row for spacing

                # Add fact table headers and data
                headers = fact_data.get('headers', [])
                if not isinstance(headers, list):
                    print(f"Warning: Invalid headers format in fact {fact_name}")
                    continue
                    
                attribute_types = fact_data.get('attributesTypes', [])
                if not isinstance(attribute_types, list):
                    print(f"Warning: Invalid attributeTypes format in fact {fact_name}")
                    attribute_types = []
                
                # Combine headers with attribute types
                header_row = []
                for i, header in enumerate(headers):
                    attr_type = attribute_types[i] if i < len(attribute_types) else ''
                    header_text = f"{header} ({attr_type})" if attr_type else str(header)
                    header_row.append(header_text)
                
                # Create and style the fact table
                if header_row:
                    # Add header row
                    sheet.append(header_row)
                    for col_idx, _ in enumerate(header_row):
                        cell = sheet.cell(row=sheet.max_row, column=col_idx + 1)
                        cell.font = Font(bold=True)
                        cell.fill = PatternFill(start_color='E0E0E0', end_color='E0E0E0', fill_type='solid')
                        cell.border = Border(
                            left=Side(style='thin'),
                            right=Side(style='thin'),
                            top=Side(style='thin'),
                            bottom=Side(style='thin')
                        )

                    # Add and style data rows
                    rows = fact_data.get('rows', [])
                    if not isinstance(rows, list):
                        print(f"Warning: Invalid rows format in fact {fact_name}")
                        continue
                        
                    for row in rows:
                        if not isinstance(row, list):
                            print(f"Warning: Invalid row format: {row}")
                            continue
                        # Convert all values to strings and handle None
                        processed_row = [str(cell) if cell is not None else '' for cell in row]
                        sheet.append(processed_row)
                        
                        # Style the row
                        for col_idx, _ in enumerate(processed_row):
                            cell = sheet.cell(row=sheet.max_row, column=col_idx + 1)
                            cell.border = Border(
                                left=Side(style='thin'),
                                right=Side(style='thin'),
                                top=Side(style='thin'),
                                bottom=Side(style='thin')
                            )
                
                sheet.append([])  # Empty row for spacing

            # Apply general styling
            print(f"Applying styles to sheet {sheet_name}")
            for row in sheet.rows:
                for cell in row:
                    try:
                        cell.font = Font(name='Arial')
                        if 'Insight Details' in str(cell.value) or 'Fact:' in str(cell.value):
                            cell.font = Font(bold=True, size=12)
                    except Exception as e:
                        print(f"Warning: Error applying style to cell: {e}")

            # Adjust column widths
            print(f"Adjusting column widths for sheet {sheet_name}")
            for column in sheet.columns:
                try:
                    max_length = 0
                    column_letter = get_column_letter(column[0].column)
                    for cell in column:
                        try:
                            if cell.value:
                                max_length = max(max_length, len(str(cell.value)))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 100)  # Cap width at 100
                    sheet.column_dimensions[column_letter].width = adjusted_width
                except Exception as e:
                    print(f"Warning: Error adjusting column width: {e}")

            # Freeze the header rows
            sheet.freeze_panes = 'A2'

        # Remove the default sheet if it exists
        if 'Sheet' in workbook.sheetnames:
            workbook.remove(workbook['Sheet'])

        # Save to a BytesIO object
        print("Saving workbook")
        excel_file = BytesIO()
        workbook.save(excel_file)
        excel_file.seek(0)

        print("Sending file")
        response = send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'insights_{request_id}.xlsx'
        )
        
        # Add CORS headers
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

    except Exception as e:
        import traceback
        error_msg = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5013)
