import React, { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const Settings: React.FC = () => {
  const [displayName, setDisplayName] = useState<string>("Jane Doe");
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [gradingScale, setGradingScale] = useState<string>("100");
  const [rubricStyle, setRubricStyle] = useState<string>("detailed");
  const [essayDeadlineReminder, setEssayDeadlineReminder] = useState<number>(24);
  const [enablePlagiarismCheck, setEnablePlagiarismCheck] = useState<boolean>(true);
  const [defaultEssayLength, setDefaultEssayLength] = useState<string>("500-750");

  const handleSave = () => {
    // Placeholder save action
    // In a real app, call an API to persist preferences
    // eslint-disable-next-line no-alert
    alert("Settings saved.");
  };

  return (
    <div className='p-6 space-y-6'>
      <h1 className='text-2xl font-bold text-neutral-900'>Settings</h1>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-neutral-900'>Profile</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-neutral-600 mb-1'>
              Display name
            </label>
            <input
              type='text'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className='w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500'
              placeholder='Enter your name'
            />
          </div>
        </div>
      </Card>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-neutral-900'>Essay Evaluation</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-neutral-600 mb-1'>
              Grading Scale
            </label>
            <select
              value={gradingScale}
              onChange={(e) => setGradingScale(e.target.value)}
              className='w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500'
            >
              <option value="100">100 Point Scale</option>
              <option value="4">4.0 GPA Scale</option>
              <option value="letter">Letter Grades (A-F)</option>
              <option value="passfail">Pass/Fail</option>
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-neutral-600 mb-1'>
              Default Essay Length
            </label>
            <select
              value={defaultEssayLength}
              onChange={(e) => setDefaultEssayLength(e.target.value)}
              className='w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500'
            >
              <option value="250-500">Short (250-500 words)</option>
              <option value="500-750">Medium (500-750 words)</option>
              <option value="750-1000">Long (750-1000 words)</option>
              <option value="1000+">Extended (1000+ words)</option>
            </select>
          </div>
        </div>
        <div>
          <label className='block text-sm font-medium text-neutral-600 mb-1'>
            Rubric Style
          </label>
          <select
            value={rubricStyle}
            onChange={(e) => setRubricStyle(e.target.value)}
            className='w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500'
          >
            <option value="detailed">Detailed (5+ criteria)</option>
            <option value="standard">Standard (3-4 criteria)</option>
            <option value="simple">Simple (2-3 criteria)</option>
            <option value="custom">Custom Rubric</option>
          </select>
        </div>
      </Card>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-neutral-900'>Notifications & Reminders</h2>
        <div className='space-y-3'>
          <label className='flex items-center justify-between p-3 rounded-lg border border-neutral-200'>
            <div>
              <span className='text-neutral-800 font-medium'>Email notifications</span>
              <p className='text-sm text-neutral-500'>Get notified about new essays and deadlines</p>
            </div>
            <input
              type='checkbox'
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className='h-4 w-4 accent-primary'
            />
          </label>

          <div className='p-3 rounded-lg border border-neutral-200'>
            <label className='block text-sm font-medium text-neutral-600 mb-1'>
              Essay deadline reminder (hours before)
            </label>
            <input
              type='number'
              value={essayDeadlineReminder}
              onChange={(e) => setEssayDeadlineReminder(Number(e.target.value))}
              min="1"
              max="168"
              className='w-20 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500'
            />
            <span className='ml-2 text-sm text-neutral-500'>hours before deadline</span>
          </div>
        </div>
      </Card>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-neutral-900'>System Preferences</h2>
        <div className='space-y-3'>
          <label className='flex items-center justify-between p-3 rounded-lg border border-neutral-200'>
            <div>
              <span className='text-neutral-800 font-medium'>Auto-save essays</span>
              <p className='text-sm text-neutral-500'>Automatically save essay progress every 30 seconds</p>
            </div>
            <input
              type='checkbox'
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className='h-4 w-4 accent-primary'
            />
          </label>

          <label className='flex items-center justify-between p-3 rounded-lg border border-neutral-200'>
            <div>
              <span className='text-neutral-800 font-medium'>Enable plagiarism detection</span>
              <p className='text-sm text-neutral-500'>Automatically check essays for plagiarism</p>
            </div>
            <input
              type='checkbox'
              checked={enablePlagiarismCheck}
              onChange={(e) => setEnablePlagiarismCheck(e.target.checked)}
              className='h-4 w-4 accent-primary'
            />
          </label>
        </div>
      </Card>

      <div className='flex justify-end'>
        <Button variant='primary' size='md' onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;


