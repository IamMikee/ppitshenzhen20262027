'use client';

import { useState, useEffect } from 'react';

export default function BirthdayTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    text: '',
    html: '',
    isActive: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/emails?type=birthday-templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          templateData: {
            ...formData,
            id: editing,
          }
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchTemplates();
        setEditing(null);
        setFormData({ name: '', subject: '', text: '', html: '', isActive: false });
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEdit = (template) => {
    setEditing(template.id);
    setFormData(template);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      // Implement delete API call
      await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
        Loading templates...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Template List */}
      {templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`border rounded-md p-3 ${
                template.isActive ? 'border-purple-400 bg-purple-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">
                    {template.name}
                    {template.isActive && (
                      <span className="ml-2 text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Subject: {template.subject}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(template)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-3">
        <h4 className="font-medium text-sm">
          {editing ? 'Edit Template' : 'Create New Template'}
        </h4>
        
        <input
          type="text"
          placeholder="Template Name (e.g., Birthday 2024)"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border rounded-md px-3 py-2 text-sm"
          required
        />
        
        <input
          type="text"
          placeholder="Subject (use {name} for personalization)"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full border rounded-md px-3 py-2 text-sm"
          required
        />
        
        <textarea
          placeholder="Email body (use {name} for personalization)"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm resize-none"
          required
        />
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded"
          />
          <label className="text-sm text-gray-700">Set as active template</label>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700"
          >
            {editing ? 'Update Template' : 'Save Template'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormData({ name: '', subject: '', text: '', html: '', isActive: false });
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}