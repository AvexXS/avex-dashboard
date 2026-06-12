"""Brevo SMTP email service using aiosmtplib."""
import os
import logging
from email.message import EmailMessage

import aiosmtplib

logger = logging.getLogger(__name__)


def _smtp_config():
    return {
        "host": os.environ.get("SMTP_HOST"),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER"),
        "password": os.environ.get("SMTP_PASS"),
        "from_email": os.environ.get("FROM_EMAIL", "noreply@avex.click"),
        "from_name": os.environ.get("FROM_NAME", "Avex Cloud"),
    }


async def _send(to_email: str, subject: str, html_body: str, text_body: str = ""):
    cfg = _smtp_config()
    if not cfg["host"] or not cfg["user"] or not cfg["password"]:
        logger.warning("SMTP not configured. Skipping email to %s.", to_email)
        logger.info("EMAIL DEBUG (would have sent):\nTo: %s\nSubject: %s\n\n%s", to_email, subject, text_body or html_body)
        return False

    msg = EmailMessage()
    msg["From"] = f'{cfg["from_name"]} <{cfg["from_email"]}>'
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(text_body or "Please view in HTML")
    msg.add_alternative(html_body, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=cfg["host"],
            port=cfg["port"],
            username=cfg["user"],
            password=cfg["password"],
            start_tls=True,
            timeout=20,
        )
        return True
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to_email, e)
        return False


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <html><body style="margin:0;padding:0;background:#000;color:#fff;font-family:Manrope,Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <div style="border-bottom:1px solid #222;padding-bottom:24px;margin-bottom:24px;">
          <h1 style="margin:0;font-family:Outfit,Arial,sans-serif;font-weight:300;letter-spacing:-1px;font-size:32px;">AVEX</h1>
        </div>
        <h2 style="font-family:Outfit,Arial,sans-serif;font-weight:500;font-size:22px;color:#fff;">{title}</h2>
        <div style="color:#aaa;font-size:15px;line-height:1.6;">{body_html}</div>
        <div style="border-top:1px solid #222;margin-top:40px;padding-top:24px;color:#555;font-size:12px;">
          Avex Cloud · High Performance Servers &amp; Designs
        </div>
      </div>
    </body></html>
    """


async def send_verification_email(to_email: str, name: str, verify_url: str) -> bool:
    body_html = f"""
      <p>Hi {name},</p>
      <p>Welcome to Avex. Please verify your email by clicking the button below.</p>
      <p style="margin:32px 0;">
        <a href="{verify_url}" style="background:#fff;color:#000;padding:14px 24px;text-decoration:none;font-weight:600;display:inline-block;">Verify email</a>
      </p>
      <p style="color:#666;font-size:13px;">If the button doesn't work, paste this into your browser:<br/><a href="{verify_url}" style="color:#aaa;">{verify_url}</a></p>
      <p style="color:#666;font-size:13px;">This link expires in 24 hours.</p>
    """
    return await _send(
        to_email,
        "Verify your Avex account",
        _wrap("Verify your email", body_html),
        f"Hi {name}, verify your email: {verify_url}",
    )


async def send_password_reset_email(to_email: str, name: str, reset_url: str) -> bool:
    body_html = f"""
      <p>Hi {name},</p>
      <p>Click below to reset your Avex password. This link expires in 1 hour.</p>
      <p style="margin:32px 0;">
        <a href="{reset_url}" style="background:#fff;color:#000;padding:14px 24px;text-decoration:none;font-weight:600;display:inline-block;">Reset password</a>
      </p>
      <p style="color:#666;font-size:13px;">If you didn't request this, just ignore this email.</p>
    """
    return await _send(
        to_email,
        "Reset your Avex password",
        _wrap("Reset your password", body_html),
        f"Reset link: {reset_url}",
    )


async def send_ticket_notification(to_email: str, name: str, ticket_id: str, subject: str, dashboard_url: str) -> bool:
    body_html = f"""
      <p>Hi {name},</p>
      <p>A new reply was posted on your ticket <strong>{subject}</strong>.</p>
      <p style="margin:32px 0;">
        <a href="{dashboard_url}" style="background:#fff;color:#000;padding:14px 24px;text-decoration:none;font-weight:600;display:inline-block;">Open ticket</a>
      </p>
      <p style="color:#666;font-size:13px;">Ticket ID: {ticket_id}</p>
    """
    return await _send(
        to_email,
        f"[Avex] New reply: {subject}",
        _wrap("New ticket reply", body_html),
        f"New reply on ticket {subject}: {dashboard_url}",
    )


async def send_invoice_email(to_email: str, name: str, invoice_number: str, amount: float, currency: str, dashboard_url: str) -> bool:
    body_html = f"""
      <p>Hi {name},</p>
      <p>Your invoice <strong>{invoice_number}</strong> for {currency} {amount:.2f} has been generated.</p>
      <p style="margin:32px 0;">
        <a href="{dashboard_url}" style="background:#fff;color:#000;padding:14px 24px;text-decoration:none;font-weight:600;display:inline-block;">View invoice</a>
      </p>
    """
    return await _send(
        to_email,
        f"[Avex] Invoice {invoice_number}",
        _wrap(f"Invoice {invoice_number}", body_html),
        f"Invoice {invoice_number}: {currency} {amount:.2f}",
    )
