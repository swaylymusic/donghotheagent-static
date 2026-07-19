# Real-estate lead operations and compliance checklist

This internal checklist supports the website implementation. It is not legal advice. Confirm brokerage policy and material advertising changes with the broker of record or brokerage manager.

## Lead intake and CRM fields

Every lead should retain: created date/time, source, landing page, referrer/UTM, client type, area, transaction timeframe, discovery source, marketing-consent status and timestamp, representation status, RECO Guide sent date, RECO Guide explained date, acknowledgement evidence, next action, and owner.

Recommended source values include `website_contact`, `home_value_consultation`, `open_house_{property-code}`, `market_report`, `buyer_guide`, `seller_guide`, `past_client_referral`, and `agent_referral`.

## CRM stages

1. New inquiry
2. Contact attempted
3. General discovery only
4. RECO Guide sent
5. RECO Guide explained
6. Representation status confirmed
7. Consultation completed
8. Active 0-3 months
9. Nurture 3-6 months
10. Nurture 6-12 months
11. Long-term nurture 1-2 years
12. Referred out
13. Closed / lost / unsubscribe

Do not treat an inquiry as newsletter consent. Only enroll contacts whose marketing-consent field is `YES`, or where another valid CASL basis has been documented.

## Follow-up cadence

- 0-3 months: agreed personal follow-up cadence based on the inquiry.
- 3-6 months: monthly useful check-in, subject to consent and relevance.
- 6-12 months: quarterly check-in.
- 1-2 years: semi-annual planning check-in.
- Annual: database review, consent basis review, stale-data cleanup, and reclassification.

Every commercial electronic message must identify the sender, include valid contact information, and provide a simple unsubscribe mechanism. Process unsubscribe requests promptly and suppress the contact from future marketing.

## RECO handoff gate

Before providing services or assistance:

1. Confirm whether the person is already represented, seeking representation, or intends to be self-represented.
2. Share and explain the RECO Information Guide.
3. Keep evidence of sharing/explanation according to brokerage policy.
4. If self-represented and assistance may be permitted, provide and explain the applicable Information and Disclosure to Self-Represented Party form first.
5. Document the relationship, services, remuneration, HST, responsibilities, and referral arrangements in the applicable written agreement.

## Open-house workflow

Create a property code without exposing confidential data, for example `forest_rd_2026_07`. Generate the QR destination as:

`https://donghotheagent.com/contact/?source=open_house_forest_rd_2026_07`

At the event, explain why details are collected. Keep inquiry/privacy consent required and marketing consent separate and optional. After submission, use only general follow-up until representation status is confirmed and the RECO gate is completed. Obtain required owner/party consent before advertising identifiable property or transaction information.

## Seller workflow

Use `https://donghotheagent.com/home-value/` for seller campaigns. Do not present an automated estimate as an appraisal or guaranteed selling price. Track consultation-to-CMA, CMA-to-listing appointment, listing appointment-to-signed representation, and signed representation-to-closed transaction.

## Referral network

Maintain an approved directory of agents by city/province and professionals by category. Record due diligence, licensing/credentials where applicable, conflicts, client consent to share information, referral agreement, remuneration disclosure, HST treatment, and outcome. Do not advertise a fixed referral percentage as universal; terms vary and must be documented. Never imply that a linked third party is part of the brokerage's services unless that is accurate and approved.
