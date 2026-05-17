FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir torch
RUN ln -s /usr/local/lib/python3.11/site-packages/nvidia/cu13/lib/libcublas.so.13 \
    /usr/local/lib/python3.11/site-packages/nvidia/cu13/lib/libcublas.so.12 && \
    ln -s /usr/local/lib/python3.11/site-packages/nvidia/cu13/lib/libcublasLt.so.13 \
    /usr/local/lib/python3.11/site-packages/nvidia/cu13/lib/libcublasLt.so.12
RUN pip install --no-cache-dir transformers

COPY download_model.py .
RUN python download_model.py

COPY server.py .

ENV LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/nvidia/cu13/lib:/usr/local/lib/python3.11/site-packages/nvidia/cuda_runtime/lib:$LD_LIBRARY_PATH

EXPOSE 9000

ENTRYPOINT ["python", "server.py"]
