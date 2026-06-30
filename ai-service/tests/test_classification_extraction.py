import pytest
import sys
import os

# Add ai-service root to python path to ensure imports work correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.classification.classifier import classify
from app.extraction.extractor import extract, extract_resume_metadata, extract_fee_receipt_metadata


def test_resume_classification_and_metadata():
    resume_text = """
CHIBA ROSHAN A
chibaroshan@example.com
+91 9876543210
OBJECTIVE
To work as a software engineer...
EDUCATION
B.Tech Information Technology from Kongu Engineering College
EXPERIENCE
Software Engineer Intern at ABC Solutions
PROJECTS
LifeVault: personal document manager
TECHNICAL SKILLS
Python, JavaScript, TypeScript, Angular
    """
    
    # 1. Classification
    extracted_fields = extract(resume_text)
    doc_type, conf = classify(resume_text, extracted_fields)
    assert doc_type == "Resume"
    assert conf > 0.5
    
    # 2. Metadata refinement
    refined = extract_resume_metadata(resume_text, extracted_fields)
    assert refined["documentName"] == "Resume"
    assert refined["holderName"] == "Chiba Roshan A"
    assert refined["organization"] == "Kongu Engineering College"
    assert refined["issueDate"] is None
    assert refined["expiryDate"] is None
    assert refined["documentNumber"] is None


def test_resume_no_organization_fallback():
    resume_text = """
JOHN DOE
john.doe@example.com
OBJECTIVE
To seek a career as a junior developer.
EDUCATION
Bachelor of Science
EXPERIENCE
Junior Dev: built simple widgets.
PROJECTS
Portfolio website
SKILLS
HTML, CSS, JS
    """
    
    extracted_fields = extract(resume_text)
    # The default metadata extractor might find some text as organization if there's keyword match
    # but for resume, we should not have any college or company indicator matched here.
    doc_type, conf = classify(resume_text, extracted_fields)
    assert doc_type == "Resume"
    
    refined = extract_resume_metadata(resume_text, extracted_fields)
    assert refined["holderName"] == "John Doe"
    assert refined["organization"] is None  # Ensures no fallback to random text


def test_passport_classification():
    passport_text = """
PASSPORT
REPUBLIC OF INDIA
Type P Code IND Passport No. Z1234567
Name: JOHN DOE
Nationality: INDIAN
Date of Birth: 01/01/1990
Date of Issue: 15/05/2020
Date of Expiry: 14/05/2030
    """
    extracted_fields = extract(passport_text)
    doc_type, conf = classify(passport_text, extracted_fields)
    assert doc_type == "Passport"
    assert conf > 0.5


def test_aadhaar_classification():
    aadhaar_text = """
GOVERNMENT OF INDIA
भारत सरकार
UNIQUE IDENTIFICATION AUTHORITY OF INDIA
AADHAAR
To
John Doe
1234 5678 9012
    """
    extracted_fields = extract(aadhaar_text)
    doc_type, conf = classify(aadhaar_text, extracted_fields)
    assert doc_type == "Aadhaar Card"
    assert conf > 0.5


def test_pan_classification():
    pan_text = """
INCOME TAX DEPARTMENT
GOVERNMENT OF INDIA
PERMANENT ACCOUNT NUMBER
PAN NO. ABCDE1234F
NAME: JOHN DOE
    """
    extracted_fields = extract(pan_text)
    doc_type, conf = classify(pan_text, extracted_fields)
    assert doc_type == "PAN Card"
    assert conf > 0.5


def test_educational_certificate_classification():
    edu_text = """
KONGU ENGINEERING COLLEGE
BOARD OF EXAMINATIONS
This is to certify that John Doe has successfully completed the program.
academic transcript of records
    """
    extracted_fields = extract(edu_text)
    doc_type, conf = classify(edu_text, extracted_fields)
    assert doc_type in ["Degree Certificate", "Educational Certificate"]
    assert conf > 0.5


def test_invoice_classification():
    invoice_text = """
TAX INVOICE
INVOICE NO: INV-2026-001
DATE: 2026-06-30
BILL TO:
JOHN DOE
TOTAL AMOUNT DUE: $150.00
    """
    extracted_fields = extract(invoice_text)
    doc_type, conf = classify(invoice_text, extracted_fields)
    assert doc_type == "Invoice"
    assert conf > 0.5


def test_fee_receipt_classification_and_metadata():
    fee_receipt_text = """
    KONGU ENGINEERING COLLEGE
    PERUNDURAI, ERODE - 638060
    FEE RECEIPT
    
    Receipt No: REC/2026/10243
    Date: 30/06/2026
    
    Student Name: John Doe
    Register No: 23ITR047
    Degree & Branch: B.Tech - Information Technology
    Semester: V
    
    S.No   Particulars                  Amount (Rs.)
    1      Tuition Fee                  55000.00
    2      Development Fee              5000.00
    3      Library Fee                  1500.00
    
    Total Amount Paid: Rs. 61500.00
    Amount in words: Sixty One Thousand Five Hundred Only.
    
    Cashier Signature
    """
    
    extracted_fields = extract(fee_receipt_text)
    doc_type, conf = classify(fee_receipt_text, extracted_fields)
    assert doc_type == "Fee Receipt"
    assert conf > 0.5
    
    refined = extract_fee_receipt_metadata(fee_receipt_text, extracted_fields)
    assert refined["documentName"] == "Fee Receipt"
    assert refined["holderName"] == "John Doe"
    assert refined["organization"] == "Kongu Engineering College"
    assert refined["documentNumber"] == "23ITR047"
    assert refined["issueDate"] == "2026-06-30T00:00:00.000Z"


def test_fee_receipt_metadata_adjacent_name():
    fee_receipt_text = """
    KONGU ENGINEERING COLLEGE
    FEE RECEIPT
    23ITR047
    John Doe
    Tuition Fee: 55000.00
    """
    extracted_fields = extract(fee_receipt_text)
    refined = extract_fee_receipt_metadata(fee_receipt_text, extracted_fields)
    assert refined["holderName"] == "John Doe"
    assert refined["organization"] == "Kongu Engineering College"
    assert refined["documentNumber"] == "23ITR047"

