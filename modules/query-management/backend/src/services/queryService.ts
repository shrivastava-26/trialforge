import { GraphQLError } from 'graphql';
import * as queryRepo from '../repositories/queryRepository';
import * as messageRepo from '../repositories/messageRepository';
import * as crossRepo from '../repositories/crossModuleRepository';
import { TfQueryRow, TfQueryMessageRow, QueryStatus, MessageAuthorRole } from '../types';
import { throwBadUserInput } from '../validation/helpers';

// --- DTOs ---

export interface Query {
  id: number;
  formInstanceId: number;
  title: string;
  description: string;
  status: QueryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QueryMessage {
  id: number;
  queryId: number;
  message: string;
  authorRole: MessageAuthorRole;
  createdAt: string;
}

export interface QueryWithMessages extends Query {
  messages: QueryMessage[];
}

function toQuery(row: TfQueryRow): Query {
  return {
    id: row.id,
    formInstanceId: row.form_instance_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: TfQueryMessageRow): QueryMessage {
  return {
    id: row.id,
    queryId: row.query_id,
    message: row.message,
    authorRole: row.author_role,
    createdAt: row.created_at,
  };
}

function requireQueryExists(id: number): TfQueryRow {
  const row = queryRepo.findById(id);
  if (!row) throw new GraphQLError('Query not found', { extensions: { code: 'NOT_FOUND' } });
  return row;
}

// --- Queries ---

export function getQueriesByFormInstance(
  formInstanceId: number,
  page: number,
  pageSize: number
): { rows: Query[]; total: number } {
  const { rows, total } = queryRepo.findByFormInstanceId(formInstanceId, page, pageSize);
  return { rows: rows.map(toQuery), total };
}

export function getQuery(id: number): QueryWithMessages {
  const row = requireQueryExists(id);
  const messages = messageRepo.findByQueryId(id).map(toMessage);
  return { ...toQuery(row), messages };
}

// --- Mutations ---

export function createQuery(
  formInstanceId: number,
  title: string,
  description: string,
  initialMessage: string
): QueryWithMessages {
  // Validate form instance exists and is SUBMITTED
  const fi = crossRepo.findFormInstanceById(formInstanceId);
  if (!fi) throw new GraphQLError('Form instance not found', { extensions: { code: 'NOT_FOUND' } });
  if (fi.status !== 'SUBMITTED') {
    throwBadUserInput(
      { formInstanceId: `Form instance must be SUBMITTED to raise a query (current: ${fi.status})` },
      'Form instance not submitted'
    );
  }

  const queryId = queryRepo.insert(formInstanceId, title, description);
  messageRepo.insert(queryId, initialMessage, 'DATA_MANAGER');
  return getQuery(queryId);
}

export function postQueryMessage(
  queryId: number,
  message: string,
  authorRole: MessageAuthorRole
): QueryWithMessages {
  const row = requireQueryExists(queryId);

  // Only allow messages when OPEN or ANSWERED
  if (row.status === 'CLOSED') {
    throwBadUserInput(
      { queryId: 'Cannot post messages to a CLOSED query' },
      'Query is closed'
    );
  }
  if (row.status === 'ARCHIVED') {
    throwBadUserInput(
      { queryId: 'Cannot post messages to an ARCHIVED query' },
      'Query is archived'
    );
  }

  messageRepo.insert(queryId, message, authorRole);

  // Update status based on who posted
  if (authorRole === 'SITE_COORDINATOR') {
    queryRepo.updateStatus(queryId, 'ANSWERED');
  } else {
    // DATA_MANAGER or ADMIN posting keeps/sets OPEN
    queryRepo.updateStatus(queryId, 'OPEN');
  }

  return getQuery(queryId);
}

export function closeQuery(queryId: number): Query {
  const row = requireQueryExists(queryId);

  if (row.status === 'CLOSED') return toQuery(row);
  if (row.status === 'ARCHIVED') {
    throwBadUserInput({ queryId: 'Cannot close an ARCHIVED query' }, 'Query is archived');
  }
  // Allowed from OPEN or ANSWERED
  queryRepo.updateStatus(queryId, 'CLOSED');
  return toQuery(queryRepo.findById(queryId)!);
}

export function reopenQuery(queryId: number): Query {
  const row = requireQueryExists(queryId);

  if (row.status !== 'CLOSED') {
    throwBadUserInput(
      { queryId: `Can only reopen a CLOSED query (current: ${row.status})` },
      'Query is not closed'
    );
  }

  queryRepo.updateStatus(queryId, 'OPEN');
  return toQuery(queryRepo.findById(queryId)!);
}

export function archiveQuery(queryId: number): Query {
  const row = requireQueryExists(queryId);
  if (row.status === 'ARCHIVED') return toQuery(row);
  queryRepo.updateStatus(queryId, 'ARCHIVED');
  return toQuery(queryRepo.findById(queryId)!);
}
