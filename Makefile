.PHONY: setup api frontend-install frontend-dev frontend-build dev clean docker-build docker-run

setup:
	pip install -r requirements.txt
	cd frontend && npm install

api:
	cd /Users/tejesh/receipt-ocr-web-app && uvicorn api.main:app --reload --port 8000

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

dev:
	@echo "Run in two terminals:"
	@echo "  make api"
	@echo "  make frontend-dev"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	rm -rf frontend/node_modules frontend/dist

docker-build:
	docker build -t receipt-ocr-web-app .

docker-run:
	docker run -p 8000:8000 --env-file .env receipt-ocr-web-app
