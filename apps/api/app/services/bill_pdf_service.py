from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Meter, MeterReading, Report, User
from app.services.bill_service import calculate_slab_bill, estimate_bill
from app.services.prepaid_service import get_prepaid_status

REPORTS_DIR = Path(__file__).resolve().parents[2] / "reports_output"
REPORTS_DIR.mkdir(exist_ok=True)


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), style)


async def generate_discom_bill_pdf(
    db: AsyncSession,
    user_id: UUID,
    meter_id: UUID,
) -> Report:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()
    meter_result = await db.execute(select(Meter).where(Meter.id == meter_id))
    meter = meter_result.scalar_one()

    bill = await estimate_bill(db, meter_id)
    prepaid = await get_prepaid_status(db, meter)

    now = datetime.now(timezone.utc)
    bill_month = now.strftime("%B %Y")
    bill_no = f"EB/{now.strftime('%Y%m')}/{str(meter_id)[:8].upper()}"
    discom = meter.utility_provider or "MPMKVVCL"
    consumer_no = getattr(meter, "consumer_number", "") or f"CONS-{str(meter_id)[:8].upper()}"
    meter_no = getattr(meter, "meter_serial", "") or f"MTR-{str(meter_id)[:10].upper()}"
    address = meter.location or "Bhopal, Madhya Pradesh — 462001"

    _, breakdown = calculate_slab_bill(bill.current_month_units)
    energy_charges = sum(row.amount for row in breakdown)

    latest_result = await db.execute(
        select(MeterReading)
        .where(MeterReading.meter_id == meter_id)
        .order_by(desc(MeterReading.recorded_at))
        .limit(1)
    )
    latest = latest_result.scalar_one_or_none()
    current_reading = latest.energy_kwh if latest else bill.current_month_units
    previous_reading = max(0, current_reading - bill.current_month_units)
    fixed_charges = 45.0
    electricity_duty = round(energy_charges * 0.06, 2)
    fuel_surcharge = round(bill.current_month_units * 0.15, 2)
    subtotal = round(energy_charges + fixed_charges + electricity_duty + fuel_surcharge, 2)

    report_id = uuid4()
    filepath = REPORTS_DIR / f"{report_id}.pdf"

    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=14, textColor=colors.HexColor("#1e3a5f"))
    header_style = ParagraphStyle("Hdr", parent=styles["Normal"], fontSize=9, textColor=colors.white, alignment=TA_CENTER)
    label_style = ParagraphStyle("Lbl", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#64748b"))
    value_style = ParagraphStyle("Val", parent=styles["Normal"], fontSize=9, textColor=colors.black)
    right_style = ParagraphStyle("Rgt", parent=value_style, alignment=TA_RIGHT)

    story = []

    header_data = [[
        _p(f"<b>{discom}</b><br/>Madhya Pradesh Madhya Kshetra Vidyut Vitaran Co. Ltd.<br/>"
           f"Bill of Supply for Electricity — Prepaid Smart Meter", header_style)
    ]]
    header_table = Table(header_data, colWidths=[174 * mm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e40af")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#1e3a8a")),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    meta_data = [
        [_p(f"<b>Bill No:</b> {bill_no}", value_style), _p(f"<b>Bill Month:</b> {bill_month}", value_style),
         _p(f"<b>Bill Date:</b> {now.strftime('%d-%m-%Y')}", value_style)],
        [_p(f"<b>Due Date:</b> {now.strftime('%d-%m-%Y')}", value_style),
         _p("<b>Category:</b> Domestic (DS-I)", value_style),
         _p(f"<b>Sanctioned Load:</b> 5 kW", value_style)],
    ]
    meta_table = Table(meta_data, colWidths=[58 * mm, 58 * mm, 58 * mm])
    meta_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    consumer_data = [
        [_p("<b>Consumer Details</b>", value_style), ""],
        [_p(f"Name: <b>{user.name}</b>", value_style), _p(f"Consumer No: <b>{consumer_no}</b>", value_style)],
        [_p(f"Address: {address}", value_style), _p(f"Meter No: <b>{meter_no}</b>", value_style)],
        [_p(f"Meter Type: Prepaid Smart Meter", value_style), _p(f"Connection: {meter.label}", value_style)],
    ]
    consumer_table = Table(consumer_data, colWidths=[87 * mm, 87 * mm])
    consumer_table.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(consumer_table)
    story.append(Spacer(1, 10))

    story.append(_p("<b>Meter Reading & Consumption</b>", value_style))
    story.append(Spacer(1, 4))

    reading_data = [
        ["Description", "Previous", "Current", "Units", "Mult.", "Consumption"],
        ["Energy (kWh)", f"{previous_reading:.2f}", f"{current_reading:.2f}",
         f"{bill.current_month_units:.2f}", "1", f"{bill.current_month_units:.2f} kWh"],
    ]
    reading_table = Table(reading_data, colWidths=[40 * mm, 26 * mm, 26 * mm, 26 * mm, 18 * mm, 38 * mm])
    reading_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(reading_table)
    story.append(Spacer(1, 10))

    story.append(_p("<b>Charges Breakdown (₹)</b>", value_style))
    story.append(Spacer(1, 4))

    charge_rows = [["Particulars", "Units", "Rate (₹)", "Amount (₹)"]]
    for row in breakdown:
        charge_rows.append([row.slab, str(row.units), str(row.rate), f"{row.amount:.2f}"])
    charge_rows.append(["Fixed Charges (FC)", "—", "—", f"{fixed_charges:.2f}"])
    charge_rows.append(["Electricity Duty @ 6%", "—", "—", f"{electricity_duty:.2f}"])
    charge_rows.append(["Fuel & Power Purchase Surcharge", "—", "—", f"{fuel_surcharge:.2f}"])
    charge_rows.append(["", "", "Total Bill Amount", f"{subtotal:.2f}"])

    charge_table = Table(charge_rows, colWidths=[70 * mm, 28 * mm, 28 * mm, 48 * mm])
    charge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ecfdf5")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(charge_table)
    story.append(Spacer(1, 10))

    payment_data = [
        [_p("<b>Prepaid Account Summary</b>", value_style), ""],
        [_p(f"Current Prepaid Balance", label_style), _p(f"<b>₹ {prepaid['balance_inr']:.2f}</b>", right_style)],
        [_p(f"Units Consumed This Month", label_style), _p(f"<b>{bill.current_month_units:.2f} kWh</b>", right_style)],
        [_p(f"Projected Monthly Bill", label_style), _p(f"<b>₹ {bill.predicted_bill_inr:.2f}</b>", right_style)],
        [_p(f"Connection Status", label_style),
         _p(f"<b>{prepaid['connection_status'].upper()}</b>", right_style)],
    ]
    payment_table = Table(payment_data, colWidths=[100 * mm, 74 * mm])
    payment_table.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(payment_table)
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Spacer(1, 6))
    story.append(_p(
        "<i>This is a computer-generated electricity bill issued by SmartEnergy AI Platform "
        f"on behalf of {discom}. For queries call 1912 / 0755-2550000. "
        "Please retain this bill for your records.</i>",
        ParagraphStyle("Foot", parent=styles["Normal"], fontSize=7, textColor=colors.grey),
    ))

    doc.build(story)

    report = Report(
        id=report_id,
        user_id=user_id,
        meter_id=meter_id,
        title=f"Electricity Bill — {bill_month}",
        file_path=str(filepath),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report
