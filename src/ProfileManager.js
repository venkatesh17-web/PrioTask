/**
 * Profile Management & Zero-Cost Persistence Module
 * 
 * Manages multiple isolated user profiles in browser localStorage:
 * - Profiles metadata key: 'task_scheduler_profiles'
 * - Active profile key: 'task_scheduler_active_profile'
 * - Isolated task storage per profile: 'tasks_profile_<profileId>'
 */

import { Task, Priority } from './Task.js';

const PROFILES_STORAGE_KEY = 'task_scheduler_profiles';
const ACTIVE_PROFILE_KEY = 'task_scheduler_active_profile';

/**
 * Standard sample initial tasks for new profiles
 * Demonstrates overdue, imminent, and varied priority tasks
 */
export function generateDefaultTasks() {
  const now = Date.now();
  return [
    {
      id: 'sample-1',
      title: 'Fix Production Authentication Outage',
      description: 'Critical JWT token validation regression blocking login for EU users.',
      priority: Priority.HIGH,
      deadline: now - 15 * 60 * 1000, // 15 mins OVERDUE!
      createdAt: now - 60 * 60 * 1000
    },
    {
      id: 'sample-2',
      title: 'Submit Compliance Audit Sign-Off',
      description: 'Review SOC2 report before auditor meeting.',
      priority: Priority.HIGH,
      deadline: now + 20 * 60 * 1000, // in 20 minutes
      createdAt: now - 30 * 60 * 1000
    },
    {
      id: 'sample-3',
      title: 'Weekly Sprint Retrospective Prep',
      description: 'Compile team burndown metrics and feedback cards.',
      priority: Priority.MEDIUM,
      deadline: now + 45 * 60 * 1000, // in 45 minutes
      createdAt: now - 20 * 60 * 1000
    },
    {
      id: 'sample-4',
      title: 'Database Index Optimization',
      description: 'Analyze slow query logs on order_items table.',
      priority: Priority.MEDIUM,
      deadline: now + 3 * 60 * 60 * 1000, // in 3 hours
      createdAt: now - 10 * 60 * 1000
    },
    {
      id: 'sample-5',
      title: 'Update README and API Docs',
      description: 'Document newly added webhooks and endpoints.',
      priority: Priority.LOW,
      deadline: now + 12 * 60 * 60 * 1000, // in 12 hours
      createdAt: now - 5 * 60 * 1000
    }
  ];
}

export class ProfileManager {
  /**
   * @param {Storage} [storage=window.localStorage]
   */
  constructor(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
    this.storage = storage;
  }

  /**
   * Retrieve all registered profiles
   * @returns {Array<{id: string, name: string, createdAt: number, taskCount?: number}>}
   */
  getProfiles() {
    if (!this.storage) return [];
    try {
      const data = this.storage.getItem(PROFILES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse profiles from localStorage', e);
      return [];
    }
  }

  /**
   * Save list of profiles
   * @param {Array<Object>} profiles 
   */
  saveProfiles(profiles) {
    if (!this.storage) return;
    this.storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }

  /**
   * Get the currently active profile ID
   * @returns {string | null}
   */
  getActiveProfileId() {
    if (!this.storage) return null;
    return this.storage.getItem(ACTIVE_PROFILE_KEY);
  }

  /**
   * Set active profile ID
   * @param {string} profileId 
   */
  setActiveProfileId(profileId) {
    if (!this.storage) return;
    this.storage.setItem(ACTIVE_PROFILE_KEY, profileId);
  }

  /**
   * Get the active profile object or default if none exists
   * @returns {Object}
   */
  getActiveProfile() {
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    const found = profiles.find((p) => p.id === activeId);

    if (found) return found;

    // If no active profile or profiles empty, initialize default profile 'venkatesh'
    if (profiles.length > 0) {
      this.setActiveProfileId(profiles[0].id);
      return profiles[0];
    }

    return this.createProfile('Venkatesh', generateDefaultTasks());
  }

  /**
   * Create a new local profile with isolated storage
   * @param {string} name - Profile display name
   * @param {Array<Object>} [initialTasks=null] - Optional initial tasks
   * @returns {Object} Newly created profile
   */
  createProfile(name, initialTasks = null) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Profile name cannot be empty');
    }

    const profiles = this.getProfiles();
    // Unique profile ID e.g. 'venkatesh' or 'profile_<slug>_<timestamp>'
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = profiles.some((p) => p.id === slug)
      ? `${slug}_${Date.now().toString(36)}`
      : slug;

    const newProfile = {
      id,
      name: trimmed,
      createdAt: Date.now()
    };

    profiles.push(newProfile);
    this.saveProfiles(profiles);
    this.setActiveProfileId(id);

    // Save initial tasks if provided
    const tasksToSave = initialTasks || generateDefaultTasks();
    this.saveTasksForProfile(id, tasksToSave);

    return newProfile;
  }

  /**
   * Delete a profile and purge its isolated localStorage key
   * @param {string} profileId 
   * @returns {boolean}
   */
  deleteProfile(profileId) {
    if (!this.storage) return false;
    let profiles = this.getProfiles();
    if (profiles.length <= 1) {
      throw new Error('Cannot delete the only existing profile');
    }

    profiles = profiles.filter((p) => p.id !== profileId);
    this.saveProfiles(profiles);

    // Purge isolated storage
    const storageKey = this.getStorageKeyForProfile(profileId);
    this.storage.removeItem(storageKey);

    // If deleted profile was active, switch to first available
    if (this.getActiveProfileId() === profileId) {
      this.setActiveProfileId(profiles[0].id);
    }

    return true;
  }

  /**
   * Storage key format for tasks: tasks_profile_<profileId>
   * @param {string} profileId 
   * @returns {string}
   */
  getStorageKeyForProfile(profileId) {
    return `tasks_profile_${profileId}`;
  }

  /**
   * Save task array for a specific profile (Isolated Auto-Save)
   * @param {string} profileId 
   * @param {Array<Object>} tasks 
   */
  saveTasksForProfile(profileId, tasks) {
    if (!this.storage) return;
    const key = this.getStorageKeyForProfile(profileId);
    const serialized = JSON.stringify(tasks);
    this.storage.setItem(key, serialized);
  }

  /**
   * Load tasks array from localStorage for a specific profile
   * @param {string} profileId 
   * @returns {Array<Object>}
   */
  loadTasksForProfile(profileId) {
    if (!this.storage) return [];
    try {
      const key = this.getStorageKeyForProfile(profileId);
      const data = this.storage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error(`Failed to load tasks for profile "${profileId}"`, e);
      return [];
    }
  }

  /**
   * Rehydrate a TaskScheduler instance from saved localStorage state
   * @param {string} profileId 
   * @param {import('./TaskScheduler.js').TaskScheduler} scheduler 
   * @returns {number} Count of rehydrated tasks
   */
  rehydrateScheduler(profileId, scheduler) {
    const rawTasks = this.loadTasksForProfile(profileId);
    scheduler.heap.clear();

    for (const item of rawTasks) {
      scheduler.addTask({
        id: item.id,
        title: item.title,
        priority: item.priority,
        deadline: item.deadline,
        createdAt: item.createdAt,
        metadata: {
          description: item.metadata?.description || item.description || ''
        }
      });
    }

    return scheduler.size;
  }
}
