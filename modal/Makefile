# pursue.report · Modal pipeline deploy commands
#
# Usage:
#   make secrets       — one-time: create the modal Secret from ../.env
#   make deploy        — deploy every job
#   make test-goes     — run a single GOES capture once
#   make logs JOB=goes_30min

SHELL := bash

JOBS = goes_30min himawari_30min meteosat_30min polar_daily \
       sentinel2_daily sentinel1_daily landsat_daily iotd_daily \
       manifest_rebuild

secrets:
	modal secret create pursue-secrets --from-dotenv ../.env

deploy:
	@for job in $(JOBS); do \
		echo "→ deploying $$job"; \
		modal deploy jobs/$$job.py || exit 1; \
	done
	@echo "✓ all jobs deployed"

deploy-%:
	modal deploy jobs/$*.py

test-%:
	modal run jobs/$*.py

logs:
	@test -n "$(JOB)" || (echo "usage: make logs JOB=goes_30min"; exit 1)
	modal app logs pursue-$(JOB)

list:
	modal app list

stop-%:
	modal app stop pursue-$*

.PHONY: secrets deploy logs list
