# Anchor

**Find the barbershops of every community.**

Anchor maps where high blood pressure goes uncontrolled, finds the places those neighbours already love and trust, and hands health workers a ready-to-walk outreach plan for them.

---

## What it is, in 3 sentences

1. High blood pressure is a leading cause of heart attacks and strokes, and most people who have it in the US do not have it under control.
2. A famous study showed that health care works far better when it goes to places people already trust, like a neighbourhood barbershop, instead of waiting for people to come to a clinic.
3. Anchor is an AI assistant that tells health workers **which** trusted places to go to in **which** neighbourhoods, using public health data and Qloo's knowledge of what people love.

## Who it helps

| Person | What Anchor does for them |
|---|---|
| **Community health worker** (a trained local person who helps neighbours get care) | Gives a list of places to visit this week, the best days to go, and what to say. |
| **Health department outreach lead** | Shows where the need is highest and which local businesses could become partners, with files that open in their own tools. |
| **Health plan or hospital community team** | Helps them reach patients who are hard to reach, which also improves the quality scores they are paid on. |
| **Venue owner** (barber, salon, cafe, gym) | Gets a clear, friendly one-page invitation explaining what a health event in their shop would involve. |

## How it works, in 4 steps

1. **You choose:** what you want to do (for example, free blood pressure checks), who you want to reach (for example, men aged 35 to 54) and where (for example, Los Angeles County).
2. **Anchor finds the need:** it uses free CDC data to find the neighbourhoods where the most adults have high blood pressure and are not taking medicine for it.
3. **Anchor finds the trust:** it asks Qloo which local places people of that age and gender in those neighbourhoods love most. That might be barbershops, but also a taco stand, a gym or a record shop.
4. **Anchor makes the plan:** it checks every place is real and suitable, ranks them, picks the best days, writes the invitations, and gives you a map, a visit schedule and files for your systems.

## Why Qloo is essential

- A map app can list every barbershop. It cannot tell you which of 40 shops men aged 35 to 54 in one neighbourhood actually love, or that the real gathering place is a taco stand two blocks away.
- An AI chatbot on its own guesses from stereotypes and old training data, and sometimes invents places that do not exist.
- **Qloo** knows what groups of people love, place by place, without using anyone's personal data. Anchor turns that into public health reach.

## What makes it different

- It is built on one of the strongest results in blood pressure research (*New England Journal of Medicine*, 2018).
- It is the first tool to answer the question that research left open: *which* places, for *this* community?
- It never guesses anyone's race or ethnicity from their tastes. It targets places by neighbourhood need, age and gender only.
- Every place it suggests comes with a reason and the evidence behind it, which anyone can check.

## Honest limits

- CDC neighbourhood numbers are **estimates from a national survey and statistical models**, not counts of real patients.
- Qloo shows what groups of people **love**. That is not the same as how many people walk through a door.
- Anchor plans outreach. It does not give medical advice, and it does not replace pharmacists, doctors or health workers.

## Key terms

| Term | Meaning |
|---|---|
| **Blood pressure (BP)** | How hard blood pushes on artery walls. Written as two numbers, for example 120/80. |
| **High blood pressure (hypertension)** | Blood pressure that stays too high (130/80 or above under current US guidelines). It often has no symptoms. |
| **Controlled** | Someone with high blood pressure whose numbers are back in a healthy range, usually with medicine. |
| **Community health worker (CHW)** | A trained person from the community who helps neighbours get health care. |
| **Outreach** | Taking health services to people, instead of waiting for them to come in. |
| **Census tract** | A small neighbourhood area used by the US Census, usually 1,200 to 8,000 people. |
| **CDC PLACES** | Free CDC data that estimates health measures, like high blood pressure, for every census tract. |
| **Qloo** | A company whose "taste graph" knows what people like across music, film, food, places and more, without personal data. |
| **Affinity** | Qloo's score for how much a group likes something, compared with average. |
| **Randomised trial** | A study where people (or places) are assigned to groups by chance, the fairest way to test whether something works. |
| **Agent** | An AI program that takes several steps on its own (searching, checking, deciding) to finish a task. |

## Files in this folder

| File | What is inside |
|---|---|
| [RESEARCH.md](RESEARCH.md) | The problem, the studies, what they do not prove, and the gap Anchor fills |
| [PLAN.md](PLAN.md) | Goals, how we aim for top marks on every judging criterion, schedule, risks, submission draft |
| [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) | Architecture, data, every Qloo call, the agent, scoring formulas, API, MCP, evaluation, security |
| [UX_AND_CONTENT.md](UX_AND_CONTENT.md) | Users, journeys, full landing page text, screens for phone and desktop, info buttons, glossary, FAQ |

Shared standards used by all projects are in [../shared](../shared).
