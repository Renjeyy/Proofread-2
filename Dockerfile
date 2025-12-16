FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p instance data && \
    chmod -R 777 instance && \
    chmod -R 777 data && \
    chmod -R 777 .

EXPOSE 7860

ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1


CMD ["gunicorn", "-b", "0.0.0.0:7860", "--timeout", "120", "app:app"]
