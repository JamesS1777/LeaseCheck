"""Builds two FICTIONAL 2-page test leases (needs: pip install reportlab):
  test-leases/bad-lease.pdf    6 planted illegal clauses mixed with legal decoys
  test-leases/clean-lease.pdf  the same lease with every illegal clause made legal;
                               only `not_standard_lease` should be flagged
Run: python3 scripts/make_test_lease.py
"""
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

DIR = Path(__file__).resolve().parent.parent / "test-leases"

# (heading, text). Planted clauses are marked with a comment for the team;
# the marker never appears in the PDF.
CLAUSES = [
    ("1. Parties", "This Lease is made between Maple Ridge Property Management (the \"Landlord\") and Alex Tremblay and Jordan Lee (the \"Tenant\")."),
    ("2. Premises", "The Landlord agrees to rent to the Tenant the residential unit at 214 Example Crescent, Unit B, Peterborough, Ontario (the \"Premises\")."),
    ("3. Term", "The tenancy begins on September 1, 2027 and ends on August 31, 2028."),
    ("4. Rent", "The Tenant shall pay rent of $1,450.00 per month, due on the first day of each month, by e-transfer to the Landlord."),
    # PLANTED: post_dated_cheques
    ("5. Payment Method", "The Tenant shall provide twelve (12) post-dated cheques for the full year of rent before moving in."),
    # DECOY (legal): last month's rent deposit
    ("6. Rent Deposit", "The Tenant shall pay a rent deposit equal to one month's rent, which will be applied to the last month of the tenancy."),
    # PLANTED: illegal_deposit
    ("7. Damage Deposit", "The Tenant shall also pay a damage deposit of $500.00, which will be returned at the end of the tenancy less any deductions the Landlord considers reasonable."),
    # DECOY (legal): refundable key deposit
    ("8. Keys", "The Tenant shall pay a refundable key deposit of $40.00, which will be returned when all keys are given back."),
    ("9. Utilities", "Heat and water are included in the rent. The Tenant is responsible for electricity and internet."),
    # PLANTED: no_pets
    ("10. Pets", "No pets of any kind are permitted in the Premises at any time."),
    # PLANTED: tenant_repairs
    ("11. Repairs", "The Tenant is responsible for the cost of all repairs to the Premises, including plumbing, heating and appliances."),
    # DECOY (legal): tenant pays for damage they cause
    ("12. Damage", "The Tenant shall pay for any damage to the Premises caused by the Tenant or the Tenant's guests, other than normal wear and tear."),
    # DECOY (legal): proper entry notice
    ("13. Entry", "The Landlord may enter the Premises for repairs or inspections after giving the Tenant at least 24 hours' written notice, between 8 a.m. and 8 p.m."),
    # DECOY (legal): ordinary cleanliness
    ("14. Cleanliness", "The Tenant shall keep the Premises reasonably clean during the tenancy."),
    # PLANTED: forced_cleaning
    ("15. Move-Out Cleaning", "Upon moving out, the Tenant must pay for a professional cleaning service chosen by the Landlord."),
    ("16. Smoking", "Smoking of any substance is not permitted inside the Premises."),
    ("17. Insurance", "The Tenant shall maintain tenant liability insurance for the full term of this Lease and provide proof on request."),
    # PLANTED: end_anytime
    ("18. Termination", "The Landlord may terminate this Lease at any time and for any reason by giving the Tenant fourteen (14) days' notice."),
    ("19. Rent Increases", "Rent may be increased only as permitted by the Residential Tenancies Act, 2006."),
    ("20. Entire Agreement", "This Lease is the entire agreement between the Landlord and the Tenant. Any change must be made in writing and signed by both parties."),
]


# Legal replacements for the planted clauses, used for clean-lease.pdf.
CLEAN = {
    "5. Payment Method": "The Tenant may pay rent by e-transfer, cheque or another method agreed with the Landlord.",
    "7. Damage Deposit": None,  # removed entirely
    "10. Pets": "The Tenant is responsible for any damage or disturbance caused by a pet kept in the Premises.",
    "11. Repairs": "The Landlord shall keep the Premises in a good state of repair. The Tenant shall promptly report any needed repairs to the Landlord.",
    "15. Move-Out Cleaning": "Upon moving out, the Tenant shall leave the Premises in a reasonably clean condition.",
    "18. Termination": "Either party may end this tenancy only as permitted by the Residential Tenancies Act, 2006.",
}


def clean_clauses():
    out = []
    for h, t in CLAUSES:
        if h in CLEAN:
            if CLEAN[h] is None:
                continue
            t = CLEAN[h]
        out.append((h, t))
    # Renumber so the headings stay in order after the removed clause.
    return [(f"{i}. {h.split('. ', 1)[1]}", t) for i, (h, t) in enumerate(out, 1)]


def build() -> None:
    write(DIR / "bad-lease.pdf", CLAUSES)
    write(DIR / "clean-lease.pdf", clean_clauses())


def write(out: Path, clauses) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("t", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=17, spaceAfter=4)
    sub = ParagraphStyle("s", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=9,
                         alignment=1, textColor="#555555", spaceAfter=14)
    head = ParagraphStyle("h", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, spaceBefore=9, spaceAfter=2)
    body = ParagraphStyle("b", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=15)

    story = [
        Paragraph("RESIDENTIAL LEASE AGREEMENT", title),
        Paragraph("SAMPLE LEASE FOR TESTING ONLY. All names and addresses are fictional.", sub),
    ]
    for h, t in clauses:
        story += [Paragraph(h, head), Paragraph(t, body)]
    story += [
        Spacer(1, 22),
        Paragraph("Landlord: ______________________________   Date: ____________", body),
        Spacer(1, 14),
        Paragraph("Tenant: ________________________________   Date: ____________", body),
        Spacer(1, 14),
        Paragraph("Tenant: ________________________________   Date: ____________", body),
    ]

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillGray(0.45)
        canvas.drawString(inch, 0.6 * inch, "Fictional sample lease for LeaseCheck testing. Not a real agreement.")
        canvas.drawRightString(letter[0] - inch, 0.6 * inch, f"Page {doc.page}")
        canvas.restoreState()

    SimpleDocTemplate(str(out), pagesize=letter, leftMargin=inch, rightMargin=inch,
                      topMargin=0.9 * inch, bottomMargin=0.9 * inch,
                      title="Residential Lease Agreement (sample)").build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"wrote {out}")


if __name__ == "__main__":
    build()
