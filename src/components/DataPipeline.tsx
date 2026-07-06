import React, { useState, useRef } from 'react';
import { useApp } from '../lib/AppContext';
import { Question, QuestionType, QuestionDifficulty } from '../types';
import { Download, Upload, CheckCircle, AlertTriangle, FileText, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DataPipelineProps {
  onImportSuccess: (deckId: string) => void;
}

export const DataPipeline: React.FC<DataPipelineProps> = ({ onImportSuccess }) => {
  const { decks, questions, addDeck, addQuestions } = useApp();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // Import State
  const [dragActive, setDragActive] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Export State
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Main file parser
  const handleFile = (file: File) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();
    setImportLogs([]);
    setImportError(null);
    setParsedData(null);

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File content is empty.');

        let logLines: string[] = [`File read: ${file.name} (${file.size} bytes)`];

        if (extension === 'json') {
          // Parse JSON
          const data = JSON.parse(text);
          let extractedQs: any[] = [];
          let deckTitle = 'Imported Deck';
          let deckDesc = 'Imported via JSON';
          let deckSubject = 'Imported';

          // Case A: StudyForge native schema
          if (data.deck && data.questions && Array.isArray(data.questions)) {
            deckTitle = data.deck.title || deckTitle;
            deckDesc = data.deck.description || deckDesc;
            deckSubject = data.deck.subject || deckSubject;
            extractedQs = data.questions;
          } 
          // Case B: Simple questions array wrapped in an object: { "questions": [...] } or { "cards": [...] }
          else if (!Array.isArray(data) && (Array.isArray(data.questions) || Array.isArray(data.cards) || Array.isArray(data.flashcards))) {
            const rawList = data.questions || data.cards || data.flashcards;
            deckTitle = data.title || data.subject || file.name.replace('.json', '');
            deckDesc = data.description || 'Imported AI Question List';
            deckSubject = data.subject || 'Imported';
            extractedQs = rawList;
          }
          // Case C: Raw Array at the root: [ { question: '...', answer: '...' }, ... ]
          else if (Array.isArray(data)) {
            deckTitle = file.name.replace('.json', '') || 'AI Raw List';
            deckDesc = 'Raw JSON list from external AI generator';
            extractedQs = data;
          } else {
            throw new Error('Unsupported JSON format. Make sure it is a questions array or contains a questions array.');
          }

          // Map the dynamic questions list to our internal structure
          const mappedQs = extractedQs.map((q: any, idx: number) => {
            // Find question text
            const question = q.question || q.q || q.prompt || q.questionText || `Question ${idx + 1}`;
            // Find answer text
            const answer = q.answer || q.a || q.correct_answer || q.correctAnswer || q.response || '';
            // Find type
            const type = (q.type as QuestionType) || (q.options && q.options.length > 0 ? 'Multiple Choice' : 'Basic Recall');
            // Find difficulty
            const difficulty = (q.difficulty as QuestionDifficulty) || 'medium';
            // Find options
            const options = Array.isArray(q.options) ? q.options : (Array.isArray(q.choices) ? q.choices : undefined);
            
            // Map correct answer representation
            let correct = q.correct !== undefined ? q.correct : q.correctIndex;
            if (correct === undefined && options && answer) {
              // Try matching answer text in options
              const matchIdx = options.findIndex((opt: string) => String(opt).toLowerCase() === String(answer).toLowerCase());
              if (matchIdx !== -1) correct = matchIdx;
            }

            return {
              type,
              difficulty,
              concept: q.concept || q.topic || 'AI Import',
              tags: Array.isArray(q.tags) ? q.tags : (q.category ? [q.category] : ['json-import']),
              question: String(question).trim(),
              options: options,
              correct: correct !== undefined ? (typeof correct === 'string' ? correct.split(',').map(Number) : correct) : undefined,
              answer: String(answer).trim(),
              explanation: q.explanation || q.exp || q.rationale || '',
            };
          });

          logLines.push(`JSON file parsed successfully.`);
          logLines.push(`Extracted ${mappedQs.length} questions from dataset.`);

          setParsedData({
            deck: {
              title: deckTitle,
              description: deckDesc,
              subject: deckSubject,
            },
            questions: mappedQs,
          });

        } else if (extension === 'xml') {
          // Parse XML
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          
          // Check for parsing errors
          const parserError = xmlDoc.getElementsByTagName('parsererror');
          if (parserError.length > 0) {
            throw new Error(`XML Parse Error: ${parserError[0].textContent}`);
          }

          const extractedQs: any[] = [];
          
          // Try to find tags representing questions: question, card, item, flashcard
          let questionNodes: HTMLCollectionOf<Element> = xmlDoc.getElementsByTagName('question');
          if (questionNodes.length === 0) {
            questionNodes = xmlDoc.getElementsByTagName('card');
          }
          if (questionNodes.length === 0) {
            questionNodes = xmlDoc.getElementsByTagName('item');
          }
          if (questionNodes.length === 0) {
            questionNodes = xmlDoc.getElementsByTagName('flashcard');
          }

          if (questionNodes.length === 0) {
            throw new Error('Could not find any <question>, <card>, <item>, or <flashcard> elements in the XML.');
          }

          for (let i = 0; i < questionNodes.length; i++) {
            const node = questionNodes[i];
            
            // Extract question prompt
            let questionText = '';
            const qTags = ['questionText', 'question', 'text', 'prompt', 'q'];
            for (const tag of qTags) {
              const el = node.getElementsByTagName(tag)[0];
              if (el) {
                questionText = el.textContent || '';
                break;
              }
            }
            if (!questionText && node.childNodes.length > 0) {
              if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
                questionText = node.textContent || '';
              }
            }

            // Extract answer
            let answerText = '';
            const aTags = ['answer', 'correctAnswer', 'a', 'correct', 'response'];
            for (const tag of aTags) {
              const el = node.getElementsByTagName(tag)[0];
              if (el) {
                answerText = el.textContent || '';
                break;
              }
            }

            // Extract explanation
            let explanationText = '';
            const expTags = ['explanation', 'exp', 'rationale', 'details'];
            for (const tag of expTags) {
              const el = node.getElementsByTagName(tag)[0];
              if (el) {
                explanationText = el.textContent || '';
                break;
              }
            }

            // Extract type, concept, difficulty
            const typeText = node.getElementsByTagName('type')[0]?.textContent || 'Basic Recall';
            const difficultyText = node.getElementsByTagName('difficulty')[0]?.textContent || 'medium';
            const conceptText = node.getElementsByTagName('concept')[0]?.textContent || 'XML Import';
            
            // Extract tags
            const tagsList: string[] = ['xml-import'];
            const tagsEl = node.getElementsByTagName('tags')[0];
            if (tagsEl) {
              const tagsArray = tagsEl.getElementsByTagName('tag');
              if (tagsArray.length > 0) {
                for (let j = 0; j < tagsArray.length; j++) {
                  if (tagsArray[j].textContent) tagsList.push(tagsArray[j].textContent!.trim());
                }
              } else {
                tagsList.push(...tagsEl.textContent?.split(',').map(t => t.trim()).filter(Boolean) || []);
              }
            }

            // Extract options for multiple choice
            const optionsList: string[] = [];
            const optionsEl = node.getElementsByTagName('options')[0] || node.getElementsByTagName('choices')[0];
            if (optionsEl) {
              const optArray = optionsEl.getElementsByTagName('option') || optionsEl.getElementsByTagName('choice');
              if (optArray.length > 0) {
                for (let j = 0; j < optArray.length; j++) {
                  if (optArray[j].textContent) optionsList.push(optArray[j].textContent!.trim());
                }
              } else {
                optionsList.push(...optionsEl.textContent?.split('\n').map(o => o.trim()).filter(Boolean) || []);
              }
            }

            // Extract correct index (number or letter like A, B, C, D)
            let correctVal: any = undefined;
            const correctEl = node.getElementsByTagName('correctIndex')[0] || node.getElementsByTagName('correctOption')[0] || node.getElementsByTagName('correct')[0];
            if (correctEl) {
              const cText = correctEl.textContent?.trim().toUpperCase() || '';
              if (cText === 'A' || cText === '0') correctVal = 0;
              else if (cText === 'B' || cText === '1') correctVal = 1;
              else if (cText === 'C' || cText === '2') correctVal = 2;
              else if (cText === 'D' || cText === '3') correctVal = 3;
              else if (!isNaN(Number(cText))) correctVal = Number(cText);
            }

            if (questionText && answerText) {
              extractedQs.push({
                type: (typeText as QuestionType) || 'Basic Recall',
                difficulty: (difficultyText as QuestionDifficulty) || 'medium',
                concept: conceptText,
                tags: tagsList,
                question: questionText.trim(),
                answer: answerText.trim(),
                explanation: explanationText.trim() || undefined,
                options: optionsList.length > 0 ? optionsList : undefined,
                correct: correctVal,
              });
            }
          }

          if (extractedQs.length === 0) {
            throw new Error('Found XML structure but could not successfully parse any valid Question/Answer blocks.');
          }

          logLines.push(`XML file parsed successfully.`);
          logLines.push(`Extracted ${extractedQs.length} questions from XML structure.`);

          setParsedData({
            deck: {
              title: file.name.replace('.xml', '') || 'XML AI Import',
              description: 'Imported via XML elements',
              subject: 'XML Import',
            },
            questions: extractedQs,
          });

        } else if (extension === 'csv') {
          // Simple CSV parser
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length < 2) {
            throw new Error('CSV must contain a header row and at least one data row.');
          }

          const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
          const qIdx = header.indexOf('question');
          const aIdx = header.indexOf('answer');

          if (qIdx === -1 || aIdx === -1) {
            throw new Error('CSV must contain "question" and "answer" columns in headers.');
          }

          logLines.push(`CSV Headers identified: ${header.join(', ')}`);

          const extractedQs = [];
          for (let i = 1; i < lines.length; i++) {
            // Simple comma splitter (ignoring escaped commas for MVP, can be expanded if needed)
            const cells = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            if (cells.length > Math.max(qIdx, aIdx)) {
              extractedQs.push({
                type: 'Basic Recall' as QuestionType,
                difficulty: 'medium' as QuestionDifficulty,
                concept: 'Imported',
                tags: ['csv-import'],
                question: cells[qIdx],
                answer: cells[aIdx],
              });
            }
          }

          logLines.push(`Successfully extracted ${extractedQs.length} basic recall questions.`);

          setParsedData({
            deck: {
              title: file.name.replace('.csv', '') || 'CSV Import',
              description: 'Imported from CSV table',
              subject: 'Imported',
            },
            questions: extractedQs,
          });

        } else if (extension === 'md' || extension === 'txt') {
          // Simple Markdown parse (Format: # Q: [Question] \n A: [Answer])
          const lines = text.split('\n');
          const extractedQs = [];
          let currentQ = '';
          let currentA = '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().startsWith('q:') || line.toLowerCase().startsWith('question:')) {
              if (currentQ && currentA) {
                extractedQs.push({
                  type: 'Basic Recall' as QuestionType,
                  difficulty: 'medium' as QuestionDifficulty,
                  concept: 'Markdown',
                  tags: ['markdown-import'],
                  question: currentQ,
                  answer: currentA,
                });
                currentQ = '';
                currentA = '';
              }
              currentQ = line.replace(/^(q:|question:)\s*/i, '');
            } else if (line.toLowerCase().startsWith('a:') || line.toLowerCase().startsWith('answer:')) {
              currentA = line.replace(/^(a:|answer:)\s*/i, '');
            }
          }

          // Push final
          if (currentQ && currentA) {
            extractedQs.push({
              type: 'Basic Recall' as QuestionType,
              difficulty: 'medium' as QuestionDifficulty,
              concept: 'Markdown',
              tags: ['markdown-import'],
              question: currentQ,
              answer: currentA,
            });
          }

          if (extractedQs.length === 0) {
            throw new Error('Could not identify any Q: [Question] and A: [Answer] lines in Markdown.');
          }

          logLines.push(`Markdown parser matched ${extractedQs.length} question pairs.`);

          setParsedData({
            deck: {
              title: file.name.replace('.md', '').replace('.txt', '') || 'Markdown Import',
              description: 'Imported from Markdown script',
              subject: 'Imported',
            },
            questions: extractedQs,
          });

        } else {
          throw new Error('Unsupported file extension. Please select .json, .xml, .csv, or .md files.');
        }

        setImportLogs(logLines);
      } catch (err: any) {
        setImportError(err.message || 'Failed to read file.');
      }
    };

    reader.readAsText(file);
  };

  const executeImportSubmit = () => {
    if (!parsedData) return;

    // 1. Create deck
    const newDeck = addDeck({
      title: parsedData.deck.title,
      description: parsedData.deck.description,
      subject: parsedData.deck.subject,
      tags: ['imported'],
    });

    // 2. Add questions
    const finalQs = parsedData.questions.map((q: any) => ({
      ...q,
      deckId: newDeck.id,
    }));

    addQuestions(finalQs);

    onImportSuccess(newDeck.id);
  };

  // Export engine
  const handleExport = () => {
    if (!selectedDeckId) return;

    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;

    const deckQs = questions.filter((q) => q.deckId === selectedDeckId);

    let blobContent = '';
    let fileName = `${deck.title.toLowerCase().replace(/\s+/g, '-')}-export`;

    if (exportFormat === 'json') {
      const payload = {
        deck: {
          title: deck.title,
          description: deck.description,
          subject: deck.subject,
        },
        questions: deckQs.map((q) => ({
          type: q.type,
          difficulty: q.difficulty,
          concept: q.concept,
          tags: q.tags,
          question: q.question,
          options: q.options,
          correct: q.correct,
          answer: q.answer,
          explanation: q.explanation,
        })),
      };

      blobContent = JSON.stringify(payload, null, 2);
      fileName += '.json';
    } else if (exportFormat === 'csv') {
      // Create CSV
      const headers = ['question', 'answer', 'type', 'difficulty', 'concept', 'tags'];
      const csvRows = [headers.join(',')];

      deckQs.forEach((q) => {
        const row = [
          `"${q.question.replace(/"/g, '""')}"`,
          `"${q.answer.replace(/"/g, '""')}"`,
          q.type,
          q.difficulty,
          q.concept || '',
          `"${q.tags.join(',')}"`,
        ];
        csvRows.push(row.join(','));
      });

      blobContent = csvRows.join('\n');
      fileName += '.csv';
    } else {
      // Create Markdown
      const mdRows = [`# ${deck.title}\n${deck.description || ''}\n`];
      deckQs.forEach((q, idx) => {
        mdRows.push(`## Question ${idx + 1}`);
        mdRows.push(`Q: ${q.question}`);
        mdRows.push(`A: ${q.answer}`);
        if (q.explanation) {
          mdRows.push(`*Explanation: ${q.explanation}*\n`);
        }
        mdRows.push('---');
      });

      blobContent = mdRows.join('\n\n');
      fileName += '.md';
    }

    const blob = new Blob([blobContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in" id="data-pipeline-container">
      {/* Tab select */}
      <div className="flex border-b border-gray-150 dark:border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-all ${
            activeTab === 'import'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Import Questions
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-all ${
            activeTab === 'export'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Export Questions
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'import' ? (
          <motion.div
            key="import-pane"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Import Question Banks</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Upload custom JSON flashcard definitions, CSV files, or simple Q/A structured Markdown.
              </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700'
              }`}
              id="file-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.md,.txt,.xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-zinc-800 rounded-full text-zinc-300">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  Drag and drop your study file here
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Supports JSON, XML, CSV, Markdown (.md), or Plain Text (.txt)
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Choose File
              </button>
            </div>

            {/* Parse errors */}
            {importError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-400 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase tracking-wider">Parsing Error</h4>
                  <p className="mt-1">{importError}</p>
                </div>
              </div>
            )}

            {/* Parser output logs */}
            {importLogs.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-4 rounded-xl space-y-2">
                <h3 className="text-xs font-bold uppercase font-mono text-gray-400">Pipeline Parsing Logs</h3>
                <div className="space-y-1">
                  {importLogs.map((log, idx) => (
                    <div key={idx} className="text-xs font-mono text-gray-600 dark:text-zinc-300 flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Imported deck preview & confirmation */}
            {parsedData && (
              <div className="p-5 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-500">Dataset ready</span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {parsedData.deck.title}
                  </h3>
                  <p className="text-xs text-gray-500">{parsedData.questions.length} questions matched.</p>
                </div>

                <button
                  onClick={executeImportSubmit}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  id="confirm-import-pipeline-btn"
                >
                  Confirm Import
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="export-pane"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Export Question Banks</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Download your studied question sets for safe-keeping or platform sharing.
              </p>
            </div>

            {decks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Create or generate decks before exporting.</p>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-6 rounded-2xl space-y-4 shadow-xs" id="export-controls-card">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                    Select Study Deck
                  </label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-250 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-sm focus:outline-hidden"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.title} ({questions.filter((q) => q.deckId === deck.id).length} cards)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                    Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['json', 'csv', 'markdown'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg uppercase border transition-all ${
                          exportFormat === fmt
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-gray-50 dark:bg-zinc-850 border-gray-250 dark:border-zinc-800 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-850">
                  <button
                    onClick={handleExport}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    id="export-pipeline-download-btn"
                  >
                    <Download className="w-4 h-4" />
                    Download Export File
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
