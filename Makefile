.PHONY: setup dev build deploy clean type-check lint

setup:
	chmod +x install.sh && ./install.sh

dev:
	npm run dev

build:
	npm run build

deploy:
	vercel --prod

clean:
	rm -rf .next node_modules
	npm install

type-check:
	npx tsc --noEmit

lint:
	npm run lint
