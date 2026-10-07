import os
import logging
import urllib.request
import urllib.parse
import json

logger = logging.getLogger("khojbeen.sms")

def send_sms_notification(mobile_number: str, message_text: str):
    """
    Pluggable SMS notification sender (Fast2SMS / Twilio).
    If no API key is configured in environment, silently logs the SMS dispatch without crashing.
    """
    if not mobile_number or not mobile_number.strip():
        return False

    phone = mobile_number.strip().replace(" ", "").replace("-", "")
    # Remove leading +91 or 0 for domestic gateway if needed
    clean_phone = phone.replace("+91", "").lstrip("0") if len(phone) > 10 else phone

    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER")

    # 1. Try Fast2SMS (Indian Gateway)
    if fast2sms_key:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": fast2sms_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            data = urllib.parse.urlencode({
                "route": "q",
                "message": message_text,
                "language": "english",
                "flash": 0,
                "numbers": clean_phone,
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=8) as response:
                res_body = response.read().decode('utf-8')
                logger.info(f"Fast2SMS dispatched successfully to {clean_phone}: {res_body}")
                return True
        except Exception as e:
            logger.warning(f"Fast2SMS delivery failed: {e}")

    # 2. Try Twilio Gateway
    elif twilio_sid and twilio_token and twilio_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            import base64
            auth_header = "Basic " + base64.b64encode(f"{twilio_sid}:{twilio_token}".encode('utf-8')).decode('utf-8')
            headers = {
                "Authorization": auth_header,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            target_phone = f"+91{clean_phone}" if not phone.startswith("+") else phone
            data = urllib.parse.urlencode({
                "From": twilio_from,
                "To": target_phone,
                "Body": message_text
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=8) as response:
                res_body = response.read().decode('utf-8')
                logger.info(f"Twilio SMS dispatched successfully to {target_phone}: {res_body}")
                return True
        except Exception as e:
            logger.warning(f"Twilio SMS delivery failed: {e}")

    # 3. Fallback: Log SMS simulation
    logger.info(f"[Mock SMS] (No API key configured in .env) Target: {mobile_number} | Message: {message_text}")
    return True
