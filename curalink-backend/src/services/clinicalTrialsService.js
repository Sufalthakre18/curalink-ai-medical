import axios from "axios";

const CLINICAL_TRIALS_BASE = "https://clinicaltrials.gov/api/v2/studies";
const MAX_RESULTS = parseInt(process.env.MAX_CLINICAL_TRIALS) || 40;

async function getClinicalTrials(condition, intervention = "", location = "") {
  console.log(`  [ClinicalTrials] Searching condition: "${condition}", intervention: "${intervention}"`);

  const allTrials = [];
  const seenIds = new Set();

  const recruitingTrials = await fetchTrials(condition, intervention, location, "RECRUITING", 20);
  for (const t of recruitingTrials) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      allTrials.push({ ...t, recruitingPriority: 2 });
    }
  }

  const activeTrials = await fetchTrials(condition, intervention, location, "ACTIVE_NOT_RECRUITING", 10);
  for (const t of activeTrials) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      allTrials.push({ ...t, recruitingPriority: 1 });
    }
  }

  const completedTrials = await fetchTrials(condition, intervention, location, "COMPLETED", 20);
  for (const t of completedTrials) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      allTrials.push({ ...t, recruitingPriority: 0 });
    }
  }

  console.log(`  [ClinicalTrials] Retrieved ${allTrials.length} trials`);
  return allTrials;
}

async function fetchTrials(condition, intervention, location, status, pageSize = 20) {
  try {
    const params = {
      "query.cond": condition,
      "filter.overallStatus": status,
      pageSize: Math.min(pageSize, MAX_RESULTS),
      format: "json",
      fields: [
        "NCTId",
        "BriefTitle",
        "OfficialTitle",
        "BriefSummary",
        "OverallStatus",
        "Phase",
        "StartDate",
        "CompletionDate",
        "EligibilityCriteria",
        "HealthyVolunteers",
        "Gender",
        "MinimumAge",
        "MaximumAge",
        "LocationFacility",
        "LocationCity",
        "LocationCountry",
        "CentralContactName",
        "CentralContactPhone",
        "CentralContactEMail",
        "LeadSponsorName",
        "Condition",
        "InterventionName",
        "InterventionType",
      ].join("|"),
    };

    if (intervention && intervention.trim()) {
      params["query.intr"] = intervention;
    }

    if (location && location.trim()) {
      params["query.locn"] = location;
    }

    const response = await axios.get(CLINICAL_TRIALS_BASE, {
      params,
      timeout: 20000,
    });

    const studies = response.data?.studies || [];
    return studies.map(parseClinicalTrial).filter(Boolean);
  } catch (error) {
    console.error(`  [ClinicalTrials Fetch Error] (${status}): ${error.message}`);
    return [];
  }
}

function parseClinicalTrial(study) {
  try {
    if (!study) return null;

    const proto = study.protocolSection || {};
    const id_module = proto.identificationModule || {};
    const status_module = proto.statusModule || {};
    const desc_module = proto.descriptionModule || {};
    const eligibility_module = proto.eligibilityModule || {};
    const contacts_module = proto.contactsLocationsModule || {};
    const sponsor_module = proto.sponsorCollaboratorsModule || {};
    const conditions_module = proto.conditionsModule || {};
    const interventions_module = proto.armsInterventionsModule || {};

    const nctId = id_module.nctId || "";
    if (!nctId) return null;

    const locations = (contacts_module.locations || []).slice(0, 5).map((loc) => ({
      facility: loc.facility || "",
      city: loc.city || "",
      country: loc.country || "",
      status: loc.status || "",
    }));

    const centralContacts = contacts_module.centralContacts || [];
    const contact = centralContacts[0] || {};

    const interventions = (interventions_module.interventions || [])
      .slice(0, 4)
      .map((i) => `${i.type || ""}: ${i.name || ""}`)
      .filter((i) => i.trim() !== ":");

    let eligibility = eligibility_module.eligibilityCriteria || "";
    if (eligibility.length > 800) {
      eligibility = eligibility.substring(0, 800) + "...";
    }

    return {
      id: `ct_${nctId}`,
      nctId,
      title: id_module.briefTitle || id_module.officialTitle || "Untitled Trial",
      officialTitle: id_module.officialTitle || "",
      summary: desc_module.briefSummary || "",
      status: status_module.overallStatus || "Unknown",
      phase: proto.designModule?.phases?.join(", ") || "Not Specified",
      startDate: status_module.startDateStruct?.date || "",
      completionDate:
        status_module.primaryCompletionDateStruct?.date ||
        status_module.completionDateStruct?.date ||
        "",
      eligibility,
      healthyVolunteers: eligibility_module.healthyVolunteers || "",
      gender: eligibility_module.sex || "All",
      minAge: eligibility_module.minimumAge || "",
      maxAge: eligibility_module.maximumAge || "",
      locations,
      contact: {
        name: contact.name || "",
        phone: contact.phone || "",
        email: contact.email || "",
      },
      sponsor: sponsor_module.leadSponsor?.name || "",
      conditions: conditions_module.conditions || [],
      interventions,
      source: "ClinicalTrials.gov",
      url: `https://clinicaltrials.gov/study/${nctId}`,
      relevanceScore: 0,
      recruitingPriority: status_module.overallStatus === "RECRUITING" ? 2 : 0,
    };
  } catch (e) {
    console.error(`  [ClinicalTrials Parse Error]: ${e.message}`);
    return null;
  }
}

export { getClinicalTrials };