import { apiService } from './api';
import type { EventBudget, EventTask, EventTimelineItem, EventGuest } from '../types/events';

const getMyEvents = (params = '') => apiService.get<any>(`/events/my-events${params}`);
const findOne = (id: string) => apiService.get<any>(`/events/${id}`);
const create = (data: any) => apiService.post<any>('/events', data);
const update = (id: string, data: any) => apiService.patch<any>(`/events/${id}`, data);
const remove = (id: string) => apiService.delete(`/events/${id}`);

// Budget
const getBudget = (eventId: string) => apiService.get<EventBudget[]>(`/events/${eventId}/budget`);
const addBudgetItem = (eventId: string, data: Omit<EventBudget, 'id'>) =>
    apiService.post<EventBudget>(`/events/${eventId}/budget`, data);
const updateBudgetItem = (itemId: string, data: Partial<EventBudget>) =>
    apiService.patch<EventBudget>(`/events/budget/${itemId}`, data);
const removeBudgetItem = (itemId: string) => apiService.delete(`/events/budget/${itemId}`);

// Checklist
const getTasks = (eventId: string) => apiService.get<EventTask[]>(`/events/${eventId}/tasks`);
const addTask = (eventId: string, data: Omit<EventTask, 'id'>) =>
    apiService.post<EventTask>(`/events/${eventId}/tasks`, data);
const updateTask = (taskId: string, data: Partial<EventTask>) =>
    apiService.patch<EventTask>(`/events/tasks/${taskId}`, data);
const updateTaskStatus = (taskId: string, status: string) =>
    apiService.patch<EventTask>(`/events/tasks/${taskId}`, { status });
const removeTask = (taskId: string) => apiService.delete(`/events/tasks/${taskId}`);

// Timeline
const getTimeline = (eventId: string) => apiService.get<EventTimelineItem[]>(`/events/${eventId}/timeline`);
const addTimelineItem = (eventId: string, data: Omit<EventTimelineItem, 'id'>) =>
    apiService.post<EventTimelineItem>(`/events/${eventId}/timeline`, data);
const updateTimelineItem = (itemId: string, data: Partial<EventTimelineItem>) =>
    apiService.patch<EventTimelineItem>(`/events/timeline/${itemId}`, data);
const removeTimelineItem = (itemId: string) => apiService.delete(`/events/timeline/${itemId}`);

// Guests
const getGuests = (eventId: string) => apiService.get<EventGuest[]>(`/events/${eventId}/guests`);
const getGuestStats = (eventId: string) => apiService.get<{ total: number; invited: number; confirmed: number; declined: number }>(`/events/${eventId}/guests/stats`);
const addGuest = (eventId: string, data: Omit<EventGuest, 'id' | 'event_id' | 'created_at' | 'updated_at'>) =>
    apiService.post<EventGuest>(`/events/${eventId}/guests`, data);
const updateGuest = (guestId: string, data: Partial<EventGuest>) =>
    apiService.patch<EventGuest>(`/events/guests/${guestId}`, data);
const removeGuest = (guestId: string) => apiService.delete(`/events/guests/${guestId}`);

export const eventsService = {
    getMyEvents,
    findOne,
    create,
    update,
    delete: remove,
    getBudget,
    addBudgetItem,
    updateBudgetItem,
    removeBudgetItem,
    getTasks,
    addTask,
    updateTask,
    updateTaskStatus,
    removeTask,
    getTimeline,
    addTimelineItem,
    updateTimelineItem,
    removeTimelineItem,
    getGuests,
    getGuestStats,
    addGuest,
    updateGuest,
    removeGuest,
};
