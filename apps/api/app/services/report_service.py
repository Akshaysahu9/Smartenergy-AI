import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Report
from app.services.analytics_service import get_carbon_footprint
from app.services.bill_service import estimate_bill
from app.services.recommendation_service import generate_recommendations

REPORTS_DIR = Path(__file__).resolve().parents[2] / "reports_output"
REPORTS_DIR.mkdir(exist_ok=True)


async def generate_pdf_report(
    db: AsyncSession, user_id: UUID, meter_id: UUID, title: str = "Monthly Energy Report"
) -> Report:
    bill = await estimate_bill(db, meter_id)
    carbon = await get_carbon_footprint(db, meter_id)
    recs = await generate_recommendations(db, user_id, meter_id)

    report_id = uuid4()
    filename = f"{report_id}.pdf"
    filepath = REPORTS_DIR / filename

    doc = SimpleDocTemplate(str(filepath), pagesize=A4)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("<b>SmartEnergy AI — Energy Report</b>", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("<b>Bill Summary</b>", styles["Heading2"]),
        Paragraph(
            f"Current month usage: {bill.current_month_units} units<br/>"
            f"Predicted bill: ₹{bill.predicted_bill_inr}",
            styles["Normal"],
        ),
        Spacer(1, 12),
        Paragraph("<b>Carbon Footprint</b>", styles["Heading2"]),
        Paragraph(
            f"Monthly kWh: {carbon.monthly_kwh}<br/>CO₂: {carbon.co2_kg} kg<br/>Trees required: {carbon.trees_required}",
            styles["Normal"],
        ),
        Spacer(1, 12),
        Paragraph("<b>Recommendations</b>", styles["Heading2"]),
    ]

    rec_data = [["Title", "Savings (₹)"]]
    for r in recs:
        rec_data.append([r.title, str(r.estimated_savings_inr)])
    table = Table(rec_data)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#06B6D4")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    story.append(table)
    doc.build(story)

    report = Report(
        id=report_id,
        user_id=user_id,
        meter_id=meter_id,
        title=title,
        file_path=str(filepath),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report
