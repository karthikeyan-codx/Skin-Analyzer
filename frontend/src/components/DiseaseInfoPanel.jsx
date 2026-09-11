import React, { useState } from 'react';
import {
  Info,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Stethoscope,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Comprehensive ANALYZER Reference Database for HAM10000 Skin Conditions
export const ANALYZER_DATABASE = {
  nv: {
    disease: 'Melanocytic Nevi',
    alias: 'Common Benign Mole',
    severity: 'Benign',
    description:
      'Melanocytic nevi are common benign proliferations of pigment-producing melanocytes. They manifest as uniform, symmetrical, well-circumscribed brown, tan, or skin-toned macules or papules on cutaneous surfaces.',
    causes: [
      'Genetic predisposition and hereditary gene variants',
      'Cumulative ultraviolet (UV) solar radiation exposure during childhood and adolescence',
      'Normal proliferation and cluster aggregation of dermal melanocytes',
      'Hormonal fluctuations during pregnancy or puberty',
    ],
    symptoms: [
      'Uniform color throughout the lesion (homogeneous brown, tan, or black)',
      'Smooth, well-defined regular borders and symmetrical shape',
      'Usually stable diameter (typically less than 6 mm)',
      'Asymptomatic without spontaneous ulceration, itching, or bleeding',
    ],
    precautions: [
      'Perform monthly self-examinations adhering to ABCDE dermatological guidelines',
      'Apply broad-spectrum SPF 30+ sunscreen daily before outdoor UV exposure',
      'Monitor for alterations in color, size, shape, or surface elevation',
      'Undergo annual routine dermoscopic screening with a certified dermatologist',
    ],
  },
  mel: {
    disease: 'Melanoma',
    alias: 'Malignant Melanocytic Neoplasm',
    severity: 'Malignant / High Risk',
    description:
      'Melanoma is an aggressive form of skin cancer arising from transformed melanocytes. Although representing a minority of skin malignancies, it accounts for the majority of skin cancer-related mortality when not recognized and excised early.',
    causes: [
      'Intense, intermittent ultraviolet (UV) radiation from sunlight and tanning devices',
      'Cellular DNA damage causing oncogenic driver mutations (e.g., BRAF V600E, NRAS, CDKN2A)',
      'High total body nevus count or presence of atypical / dysplastic nevi',
      'Phenotypic factors: Fitzpatrick skin types I–II (fair skin, light hair, tendency to burn)',
    ],
    symptoms: [
      'Asymmetrical lesion architecture where one half fails to match the other',
      'Irregular, notched, scalloped, or poorly circumscribed borders',
      'Color variegation with multiple hues (shades of brown, black, blue, white, or red)',
      'Evolution in size, shape, surface elevation, or newly acquired bleeding/pruritus',
    ],
    precautions: [
      'Immediate referral to a specialist or surgical oncologist for full-thickness biopsy',
      'Strict avoidance of peak midday sunlight (10:00 AM – 4:00 PM) and tanning beds',
      'Perform rigorous whole-body ANALYZER dermoscopy every 3 to 6 months',
      'Educate first-degree biological relatives regarding familial melanoma risk factors',
    ],
  },
  bkl: {
    disease: 'Benign Keratosis',
    alias: 'Seborrheic Keratosis / Solar Lentigo',
    severity: 'Benign',
    description:
      'Benign keratosis-like lesions encompass seborrheic keratoses, solar lentigines, and lichen planus-like keratoses (LPLK). These are non-cancerous cutaneous growths that commonly emerge on sun-exposed anatomical zones with increasing age.',
    causes: [
      'Cumulative chronological skin aging and intrinsic cellular senescence',
      'Chronic long-term environmental solar exposure',
      'Keratinocyte hyperproliferation without cellular dysplasia',
      'Somatic mutations in FGFR3 and PIK3CA genes restricted to the epidermis',
    ],
    symptoms: [
      'Well-demarcated round or oval plaques with a characteristic "stuck-on" appearance',
      'Waxy, verrucous, velvety, or hyperkeratotic surface texture',
      'Pigmentation varying from pale tan to deep dark brown',
      'Generally asymptomatic, though friction from clothing may produce irritation',
    ],
    precautions: [
      'Routine ANALYZER confirmation to rule out seborrheic-like melanoma variants',
      'Avoid mechanical picking, scratching, or unsterilized home removal',
      'Gentle cryotherapy or curettage if lesions undergo chronic chafing',
      'Daily UV defense to minimize the proliferation of adjacent solar lentigines',
    ],
  },
  bcc: {
    disease: 'Basal Cell Carcinoma',
    alias: 'Non-Melanoma Cutaneous Malignancy',
    severity: 'Locally Invasive / Moderate Risk',
    description:
      'Basal cell carcinoma (BCC) is the most frequent malignancy diagnosed in humans worldwide. Arising from non-keratinizing cells in the basal layer of the epidermis, it exhibits slow local progression and minimal metastatic potential, though significant tissue destruction can occur if untreated.',
    causes: [
      'Cumulative and recreational ultraviolet exposure initiating PTCH1 / Hedgehog pathway mutations',
      'History of therapeutic ionizing radiation or chronic immunosuppressive therapy',
      'Prior episodes of severe blistering sunburns',
      'Genetic syndromes such as Gorlin-Goltz (Nevoid Basal Cell Carcinoma Syndrome)',
    ],
    symptoms: [
      'Pearly, translucent nodule or papule with prominent arborizing telangiectatic vessels',
      'Central ulceration or rolled borders (rodent ulcer configuration)',
      'Non-healing scabs that repeatedly bleed upon minor trauma and recur',
      'Scar-like firm indurated plaque with indistinct lateral margins (morpheaform BCC)',
    ],
    precautions: [
      'Schedule ANALYZER assessment for surgical excision or Mohs micrographic surgery',
      'Strict photoprotection with UV-protective clothing and physical sunscreens (zinc oxide/titanium dioxide)',
      'Follow-up surveillance every 6 to 12 months due to high risk of subsequent secondary BCCs',
      'Prompt dermatologic review of non-healing lesions persisting longer than 4 weeks',
    ],
  },
  akiec: {
    disease: 'Actinic Keratoses',
    alias: 'Solar Keratosis / Intraepithelial Carcinoma',
    severity: 'Precancerous / High Vigilance',
    description:
      'Actinic keratoses (AK) are common precancerous epidermal dysplasias induced by chronic solar damage. If left unmanaged, a subset of lesions may progress along a continuous spectrum into invasive cutaneous squamous cell carcinoma (cSCC).',
    causes: [
      'Chronic cumulative UV exposure leading to recurrent TP53 tumor suppressor mutations',
      'Advanced chronological age and compromised epidermal repair mechanisms',
      'Immunosuppressive regimens following solid organ transplantation',
      'Prolonged occupational outdoor sun exposure without consistent physical protection',
    ],
    symptoms: [
      'Rough, gritty, sandpaper-like texture detectable upon light palpation',
      'Erythematous scaly or hyperkeratotic crusts on an erythematous base',
      'Predilection for face, balding scalp, ears, dorsal hands, and forearms',
      'Occasional mild stinging, burning sensation, or pruritus upon sun exposure',
    ],
    precautions: [
      'Field-directed or lesion-directed intervention (cryotherapy, 5-fluorouracil, imiquimod, or PDT)',
      'Rigorous daily use of broad-spectrum SPF 50+ sunscreen and wide-brimmed hats',
      'Evaluation every 6 months to detect any early transition to invasive squamous cell carcinoma',
      'Self-monitoring for rapid growth, bleeding, or marked tenderness',
    ],
  },
  vasc: {
    disease: 'Vascular Lesion',
    alias: 'Cherry Angioma / Pyogenic Granuloma',
    severity: 'Benign',
    description:
      'Vascular skin lesions represent benign endothelial cell proliferations or focal ectasias of superficial cutaneous microvessels. This category includes cherry angiomas, angiokeratomas, and reactive pyogenic granulomas.',
    causes: [
      'Benign microvascular proliferation and microcapillary dilation',
      'Minor cutaneous physical trauma provoking reactive granulation (pyogenic granuloma)',
      'Hormonal influences during pregnancy or systemic estrogen therapy',
      'Natural biological vascular aging processes',
    ],
    symptoms: [
      'Bright red, purple, or violaceous discrete papules or macules',
      'Partial or complete blanching observed under direct dermoscopic diascopy pressure',
      'Smooth dome-shaped contour or lobulated pedicle',
      'Rapid bleeding upon minor superficial scratches or friction',
    ],
    precautions: [
      'ANALYZER examination to distinguish vascular ectasias from amelanotic melanoma or Kaposi sarcoma',
      'Electrocautery, pulsed dye laser, or shave excision if lesions bleed recurrently',
      'Avoid picking or attempting non-sterile home removal',
      'Protect high-friction anatomical regions with protective dressings if necessary',
    ],
  },
  df: {
    disease: 'Dermatofibroma',
    alias: 'Benign Fibrous Histiocytoma',
    severity: 'Benign',
    description:
      'Dermatofibromas are common, harmless fibrohistiocytic dermal nodules. They characteristically appear on the extremities of adults and demonstrate pathognomonic central tethering to overlying epidermis.',
    causes: [
      'Reactive fibroblastic and histiocytic response following minor cutaneous trauma',
      'Superficial arthropod/insect bites or thorn pricks',
      'Subclinical folliculitis or ingrown hair micro-injuries',
      'Spontaneous benign dermal mesenchymal proliferation',
    ],
    symptoms: [
      'Firm, discrete nodule typically located on the lower legs or upper arms',
      'Positive "pinch sign" / "dimple sign" where the lesion dips downward when compressed laterally',
      'Color range from pinkish-tan to hyperpigmented dark brown with a pale central scar-like area',
      'Asymptomatic, though pressure or shaving may elicit localized tenderness',
    ],
    precautions: [
      'Reassurance of benign nature once confirmed via dermatoscopic evaluation',
      'No active surgical intervention required unless symptomatic or cosmetically bothersome',
      'Exercise caution during shaving to prevent recurrent laceration and bleeding',
      'Seek ANALYZER re-evaluation if unusual rapid expansion, color variegation, or pain occurs',
    ],
  },
};

export default function DiseaseInfoPanel({ diseaseClass, diseaseName }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const normalizedClass = (diseaseClass || '').toLowerCase().trim();
  const info = ANALYZER_DATABASE[normalizedClass] || {
    disease: diseaseName || 'ANALYZER Skin Condition',
    alias: 'Cutaneous Lesion',
    severity: 'ANALYZER Evaluation Advised',
    description:
      'Dermoscopic examination reveals diagnostic patterns consistent with this lesion category. A comprehensive ANALYZER history and in-person dermoscopic examination remain the definitive ANALYZER standard.',
    causes: [
      'Cellular genetic mutations and altered epidermal differentiation',
      'Cumulative solar ultraviolet (UV) radiation exposure',
      'Intrinsic environmental and hereditary factors',
    ],
    symptoms: [
      'Macular or papular cutaneous alteration',
      'Focal alterations in pigment distribution',
      'Structural contour changes across the lesion boundary',
    ],
    precautions: [
      'Consult a certified dermatologist or licensed medical practitioner',
      'Perform routine photoprotection with broad-spectrum sunscreen',
      'Avoid scratching, picking, or unverified home treatments',
    ],
  };

  const isHighRisk = ['mel', 'bcc', 'akiec'].includes(normalizedClass);

  return (
    <div className="w-full fluent-card p-6 sm:p-8 space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isHighRisk
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                ANALYZER Reference & Condition Dossier
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isHighRisk
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {info.severity}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evidence-based dermatological pathology context for {info.disease}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-[var(--border-subtle)] text-xs text-slate-300 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>{isExpanded ? 'Collapse Details' : 'Expand Details'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Description Block */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
                <Stethoscope className="w-4 h-4 text-blue-400" />
                <span>Pathological Description</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {info.description}
              </p>
            </div>

            {/* 3-Column ANALYZER Matrix: Causes, Symptoms, Precautions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Possible Causes */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Possible Causes</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-400">
                  {info.causes.map((cause, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-blue-400 font-bold">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* General Symptoms */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  <span>General Symptoms</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-400">
                  {info.symptoms.map((symptom, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* General Precautions */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>General Precautions</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-400">
                  {info.precautions.map((precaution, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{precaution}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mandatory Medical Disclaimer */}
            <div className="rounded-xl p-4 bg-blue-950/20 border border-blue-500/20 flex items-start gap-3 text-xs text-slate-300">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-300">ANALYZER Disclaimer</p>
                <p className="text-slate-400 leading-relaxed">
                  This prediction is generated by a deep learning model and should not replace professional medical diagnosis. Consult a certified medical specialist or board-certified dermatologist for personal ANALYZER decisions.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
