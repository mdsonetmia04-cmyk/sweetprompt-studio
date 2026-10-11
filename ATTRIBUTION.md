# Attribution

## Copyright

Copyright 2026 sonetmia — original work on SweetPrompt Studio  
Derivative clone maintained independently as **sweetprompt-studio**.

## Origin

This project is an independent derivative clone of **SweetPrompt Studio**
(https://github.com/sonetmia/SweetPromptsPro), which is licensed under the
Apache License, Version 2.0.

It was created with the explicit authorization and request of the original
repository owner, who asked for a functionally complete, independently
maintainable and deployable copy of his own application.

## What was changed in the clone

- Renamed package to `sweetprompt-studio` (version `1.0.0`) so the clone
  has its own identity and can be published/deployed independently.
- Added an automated test suite (vitest) covering the pure/logic modules
  with mocked AI providers — no live API keys used in tests.
- Added this `ATTRIBUTION.md`, a `LICENSE` (Apache-2.0) file preserving the
  original author's copyright, and a clone-specific `README.md` and
  `TEST_REPORT.md`.
- All other application code is preserved from the source at the time of
  cloning; known-good dependency versions were kept pinned exactly.

Per Apache-2.0 section 4, modified files carry notices where changed, and
the original attribution notices are retained.
