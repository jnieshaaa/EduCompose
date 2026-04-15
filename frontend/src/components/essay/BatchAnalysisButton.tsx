import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Loader2, AlertCircle } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { analysisApi } from "../../api";
import type { Essay, AnalysisResponse } from "../../types/Essay";

interface BatchAnalysisButtonProps {
  selectedEssays: Essay[];
  onAnalysisComplete?: () => void;
}

const BatchAnalysisButton: React.FC<BatchAnalysisButtonProps> = ({
  selectedEssays,
  onAnalysisComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{
      essay_id: number | string;
      essay_title: string;
      student_id: number | string;
      analysis?: AnalysisResponse;
      error?: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const handleBatchAnalyze = async () => {
    if (selectedEssays.length === 0) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const essayIds = selectedEssays.map((e) => e.id);
      const response = await analysisApi.batchAnalyze(
        essayIds,
        "comprehensive"
      );
      setResults(response.results);
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze essays";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={selectedEssays.length === 0}
      >
        <CheckSquare className="w-4 h-4 mr-2" />
        Batch Analyze ({selectedEssays.length})
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setResults([]);
          setError(null);
        }}
        title="Batch Analysis"
        size="lg"
      >
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-neutral-600 mb-4">
              Analyzing {selectedEssays.length} essay
              {selectedEssays.length !== 1 ? "s" : ""}...
            </p>
            <div className="space-y-2 mb-4">
              {selectedEssays.map((essay) => (
                <div
                  key={essay.id}
                  className="flex items-center justify-between p-2 bg-neutral-50 rounded"
                >
                  <span className="text-sm text-neutral-700">
                    {essay.title}
                  </span>
                  {results.find((r) => r.essay_id === essay.id) && (
                    <Badge variant="success" size="sm">
                      Complete
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {!loading && results.length === 0 && (
              <Button
                variant="primary"
                onClick={handleBatchAnalyze}
                className="w-full"
              >
                Start Analysis
              </Button>
            )}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin mr-2" />
                <span className="text-sm text-neutral-600">
                  Analyzing essays...
                </span>
              </div>
            )}
          </Card>

          {results.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-neutral-900">Results</h4>
                <div className="flex space-x-2">
                  {successCount > 0 && (
                    <Badge variant="success" size="sm">
                      {successCount} Success
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="error" size="sm">
                      {errorCount} Errors
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-rd border ${
                      result.error
                        ? "bg-error-50 border-error-200"
                        : "bg-success-50 border-success-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-neutral-900">
                          {result.essay_title || `Essay ${result.essay_id}`}
                        </p>
                        {result.error ? (
                          <p className="text-sm text-error-dark mt-1">
                            {result.error}
                          </p>
                        ) : (
                          <p className="text-sm text-neutral-600 mt-1">
                            Overall Score:{" "}
                            {result.analysis?.scores?.overall?.toFixed(1) ||
                              "N/A"}
                          </p>
                        )}
                      </div>
                      {result.error ? (
                        <AlertCircle className="w-5 h-5 text-error-default" />
                      ) : (
                        <CheckSquare className="w-5 h-5 text-success-default" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}

          {error && (
            <Card className="bg-error-50 border border-error-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-error-default" />
                <p className="text-sm text-error-dark">{error}</p>
              </div>
            </Card>
          )}
        </div>
      </Modal>
    </>
  );
};

export default BatchAnalysisButton;
