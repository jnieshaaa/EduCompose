import os

path = r'c:\Users\j_ant\projects\EduCompose\frontend\src\services\activityService.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start and end of fetchEssayAnalysis
start_idx = -1
for i, line in enumerate(lines):
    if 'export const fetchEssayAnalysis = async (' in line:
        start_idx = i
        break

if start_idx == -1:
    print("Could not find start of fetchEssayAnalysis")
    exit(1)

# Find where the next export or the end of the file is
end_idx = -1
for i in range(start_idx + 1, len(lines)):
    if 'export const ' in lines[i] or 'export function ' in lines[i]:
        end_idx = i
        break
if end_idx == -1:
    end_idx = len(lines)

new_func = """export const fetchEssayAnalysis = async (
  studentId: string,
  activityId: string,
): Promise<{
  analysis: Omit<import("../types/Essay").AnalysisResponse, "essay_id">;
  text: string;
  title: string;
  plagiarismResults?: import("../api").PlagiarismCheckResponse | null;
  aiDetectionResults?: import("../api").AIDetectionResponse | null;
  filePath?: string | null;
} | null> => {
  try {
    const studentDbId = await resolveStudentIdForEssayFilter(studentId);
    const activityDbId = resolveActivityIdForEssayFilter(activityId);
    if (studentDbId == null || activityDbId == null) {
      return null;
    }

    const { data: essayData, error: essayError } = await supabase
      .from("essays")
      .select("id, title, file_path")
      .eq("student_id", studentDbId)
      .eq("activity_id", activityDbId)
      .maybeSingle();

    if (essayError) {
      console.error("[fetchEssayAnalysis] Essay query error:", essayError);
      throw new Error(`Database error: ${essayError.message}`);
    }

    if (!essayData) {
      throw new Error("No submission found for this activity. Please ensure you have submitted your essay.");
    }

    let analysisData = null;
    let analysisError = null;

    try {
      const result = await supabase
        .from("essay_analysis_results")
        .select("*")
        .eq("essay_id", essayData.id)
        .maybeSingle();

      analysisData = result.data;
      analysisError = result.error;
    } catch (e) {
      console.error("[fetchEssayAnalysis] Analysis results fetch error:", e);
      analysisError = { code: "FETCH_ERROR" };
    }

    if (analysisError || !analysisData) {
      const { data: fallbackEssay, error: fallbackError } = await supabase
        .from("essays")
        .select(`
          id, title, file_path, content,
          analysis_payload,
          overall_score, grammar_score, readability_score, coherence_score, argument_strength_score,
          grammar_errors, style_issues, argument_analysis,
          word_count, status
        `)
        .eq("id", essayData.id)
        .maybeSingle();

      if (fallbackError || !fallbackEssay) {
        throw new Error("Analysis results not found. Please wait for the teacher to grade your work or for the AI analysis to complete.");
      }

      if (fallbackEssay.analysis_payload) {
        analysisData = fallbackEssay.analysis_payload;
      } else if (fallbackEssay.overall_score !== null) {
        analysisData = {
          scores: {
            overall: fallbackEssay.overall_score,
            grammar: fallbackEssay.grammar_score,
            readability: fallbackEssay.readability_score,
            coherence: fallbackEssay.coherence_score,
            argument_strength: fallbackEssay.argument_strength_score,
            knowledge_graph: 0
          },
          detailed_analysis: {
            grammar: { errors: fallbackEssay.grammar_errors },
            readability: { issues: fallbackEssay.style_issues },
            argumentation: fallbackEssay.argument_analysis?.argumentation,
            knowledge_graph: fallbackEssay.argument_analysis?.knowledge_graph,
            coherence: fallbackEssay.argument_analysis?.coherence
          }
        };
      }

      if (!analysisData) {
        throw new Error("Analysis results are not yet available.");
      }

      let text = fallbackEssay.content || "";
      return {
        analysis: analysisData,
        text: text,
        title: fallbackEssay.title || "Essay Analysis",
        filePath: fallbackEssay.file_path,
      };
    }

    return {
      analysis: analysisData,
      text: analysisData.original_text || "",
      title: essayData.title || "Essay Analysis",
      filePath: essayData.file_path,
    };
  } catch (err) {
    console.error("[fetchEssayAnalysis] Error:", err);
    throw err;
  }
};
"""

new_lines = lines[:start_idx] + [new_func + '\n'] + lines[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated fetchEssayAnalysis")
