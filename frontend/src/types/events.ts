export interface EventBudget {
    id: string;
    category: string;
    item_name: string;
    estimated_cost: number;
    actual_cost: number;
    paid_amount: number;
    notes?: string;
}

export interface EventTask {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    due_date?: string;
    assigned_to?: string;
}

export interface EventTimelineItem {
    id: string;
    start_time: string;
    end_time?: string;
    activity: string;
    description?: string;
    order_index: number;
}

export interface EventGuest {
    id: string;
    event_id: string;
    name: string;
    email?: string;
    phone?: string;
    status: 'invited' | 'confirmed' | 'declined' | 'maybe';
    notes?: string;
    created_at?: string;
    updated_at?: string;
}
