import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import {
  CALENDAR_COLORS,
  CALENDAR_CATEGORIES,
  CALENDAR_TAGS,
} from '../../types/calendar';
import type { CalendarEvent, CalendarColor, CalendarCategory, CalendarTag } from '../../types/calendar';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  event?: CalendarEvent | null; // null = creating, CalendarEvent = editing
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetime(local: string): string {
  return new Date(local).toISOString();
}

export function EventModal({ isOpen, onClose, onSave, onDelete, event }: EventModalProps) {
  const isEditing = !!event;

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [startTime, setStartTime] = useState(event?.startTime ? toLocalDatetime(event.startTime) : '');
  const [endTime, setEndTime] = useState(event?.endTime ? toLocalDatetime(event.endTime) : '');
  const [color, setColor] = useState<CalendarColor>(event?.color || 'blue');
  const [category, setCategory] = useState<CalendarCategory | undefined>(event?.category);
  const [tags, setTags] = useState<CalendarTag[]>(event?.tags || []);

  const handleSave = () => {
    if (!title.trim() || !startTime || !endTime) return;

    const saved: CalendarEvent = {
      id: event?.id || uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: fromLocalDatetime(startTime),
      endTime: fromLocalDatetime(endTime),
      color,
      category,
      tags: tags.length > 0 ? tags : undefined,
    };

    onSave(saved);
    onClose();
  };

  const toggleTag = (tag: CalendarTag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'EDIT EVENT' : 'NEW EVENT'} size="md">
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (optional)</label>
          <textarea
            className="w-full px-3 py-2 bg-dark-card border border-dark-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            placeholder="Event description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="End"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Color</label>
          <div className="flex gap-2">
            {CALENDAR_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`w-7 h-7 transition-all ${
                  color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-card scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => setColor(c.value)}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
          <div className="flex flex-wrap gap-2">
            {CALENDAR_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(category === cat ? undefined : cat)}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-hover text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-2">
            {CALENDAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  tags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-hover text-gray-400 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-dark-border">
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => { onDelete(event!.id); onClose(); }}
              className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-terminal-red bg-terminal-red/10 hover:bg-terminal-red/20 transition-colors"
            >
              DELETE
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-terminal-muted hover:text-white bg-dark-hover transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || !startTime || !endTime}
            className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? 'SAVE' : 'CREATE'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
