import { promisifyAll } from 'bluebird';
import { MessageManager } from '../../system/app/message-manager/message-manager';
import { GetScheduledMessagesRequestDTO } from '../controllers/api/main/scheduled-messages/get-scheduled-messages/get-scheduled-messages.request.DTO';
import { GetPendingMessagesRequestDTO } from '../controllers/api/namespaces/queue/pending-messages/get-pending-messages/get-pending-messages.request.DTO';
import { GetAcknowledgedMessagesRequestDTO } from '../controllers/api/namespaces/queue/acknowledged-messages/get-acknowledged-messages/get-acknowledged-messages.request.DTO';
import { GetDeadLetteredMessagesRequestDTO } from '../controllers/api/namespaces/queue/dead-lettered-messages/get-dead-lettered-messages/get-dead-lettered-messages.request.DTO';
import { DeletePendingMessageRequestDTO } from '../controllers/api/namespaces/queue/pending-messages/delete-pending-message/delete-pending-message.request.DTO';
import { DeletePendingMessageWithPriorityRequestDTO } from '../controllers/api/namespaces/queue/pending-messages-with-priority/delete-pending-message-with-priority/delete-pending-message-with-priority.request.DTO';
import { DeleteAcknowledgedMessageRequestDTO } from '../controllers/api/namespaces/queue/acknowledged-messages/delete-acknowledged-message/delete-acknowledged-message.request.DTO';
import { DeleteDeadLetteredMessageRequestDTO } from '../controllers/api/namespaces/queue/dead-lettered-messages/delete-dead-lettered-message/delete-dead-lettered-message.request.DTO';
import { DeleteScheduledMessageRequestDTO } from '../controllers/api/main/scheduled-messages/delete-scheduled-message/delete-scheduled-message-request.DTO';
import { RequeueDeadLetteredMessageRequestDTO } from '../controllers/api/namespaces/queue/dead-lettered-messages/requeue-dead-lettered-message/requeue-dead-lettered-message.request.DTO';
import { RequeueAcknowledgedMessageRequestDTO } from '../controllers/api/namespaces/queue/acknowledged-messages/requeue-acknowledged-message/requeue-acknowledged-message.request.DTO';
import { PurgeDeadLetteredMessagesRequestDTO } from '../controllers/api/namespaces/queue/dead-lettered-messages/purge-dead-lettered-messages/purge-dead-lettered-messages.request.DTO';
import { PurgeAcknowledgedMessagesRequestDTO } from '../controllers/api/namespaces/queue/acknowledged-messages/purge-acknowledged-messages/purge-acknowledged-messages.request.DTO';
import { PurgePendingMessagesRequestDTO } from '../controllers/api/namespaces/queue/pending-messages/purge-pending-messages/purge-pending-messages.request.DTO';
import { PurgePendingMessagesWithPriorityRequestDTO } from '../controllers/api/namespaces/queue/pending-messages-with-priority/purge-pending-messages-with-priority/purge-pending-messages-with-priority.request.DTO';

const messageManagerAsync = promisifyAll(MessageManager.prototype);

export class MessagesService {
  protected messageManager: typeof messageManagerAsync;

  constructor(messageManager: MessageManager) {
    this.messageManager = promisifyAll(messageManager);
  }

  async getScheduledMessages(args: GetScheduledMessagesRequestDTO) {
    const { skip = 0, take = 1 } = args;
    const r = await this.messageManager.getScheduledMessagesAsync(skip, take);
    return {
      ...r,
      items: r.items.map((i) => i.toJSON()),
    };
  }

  async getPendingMessages(args: GetPendingMessagesRequestDTO) {
    const { ns, queueName, skip = 0, take = 1 } = args;
    const r = await this.messageManager.getPendingMessagesAsync(
      {
        name: queueName,
        ns,
      },
      skip,
      take,
    );
    return {
      ...r,
      items: r.items.map((i) => ({ ...i, message: i.message.toJSON() })),
    };
  }

  async getAcknowledgedMessages(args: GetAcknowledgedMessagesRequestDTO) {
    const { ns, queueName, skip = 0, take = 1 } = args;
    const r = await this.messageManager.getAcknowledgedMessagesAsync(
      {
        name: queueName,
        ns,
      },
      skip,
      take,
    );
    return {
      ...r,
      items: r.items.map((i) => ({ ...i, message: i.message.toJSON() })),
    };
  }

  async getPendingMessagesWithPriority(args: GetPendingMessagesRequestDTO) {
    const { ns, queueName, skip = 0, take = 1 } = args;
    const r = await this.messageManager.getPendingMessagesWithPriorityAsync(
      {
        name: queueName,
        ns,
      },
      skip,
      take,
    );
    return {
      ...r,
      items: r.items.map((i) => i.toJSON()),
    };
  }

  async getDeadLetteredMessages(args: GetDeadLetteredMessagesRequestDTO) {
    const { ns, queueName, skip = 0, take = 1 } = args;
    const r = await this.messageManager.getDeadLetteredMessagesAsync(
      {
        name: queueName,
        ns,
      },
      skip,
      take,
    );
    return {
      ...r,
      items: r.items.map((i) => ({ ...i, message: i.message.toJSON() })),
    };
  }

  async deletePendingMessage(
    args: DeletePendingMessageRequestDTO,
  ): Promise<void> {
    const { ns, queueName, id, sequenceId } = args;
    return this.messageManager.deletePendingMessageAsync(
      {
        name: queueName,
        ns,
      },
      sequenceId,
      id,
    );
  }

  async deletePendingMessageWithPriority(
    args: DeletePendingMessageWithPriorityRequestDTO,
  ): Promise<void> {
    const { ns, queueName, id } = args;
    return this.messageManager.deletePendingMessageWithPriorityAsync(
      {
        name: queueName,
        ns,
      },
      id,
    );
  }

  async deleteAcknowledgedMessage(
    args: DeleteAcknowledgedMessageRequestDTO,
  ): Promise<void> {
    const { ns, queueName, id, sequenceId } = args;
    return this.messageManager.deleteAcknowledgedMessageAsync(
      {
        name: queueName,
        ns,
      },
      sequenceId,
      id,
    );
  }

  async deleteDeadLetteredMessage(
    args: DeleteDeadLetteredMessageRequestDTO,
  ): Promise<void> {
    const { ns, queueName, id, sequenceId } = args;
    return this.messageManager.deleteDeadLetteredMessageAsync(
      {
        name: queueName,
        ns,
      },
      sequenceId,
      id,
    );
  }

  async deleteScheduledMessage(
    args: DeleteScheduledMessageRequestDTO,
  ): Promise<void> {
    const { id } = args;
    return this.messageManager.deleteScheduledMessageAsync(id);
  }

  async requeueDeadLetteredMessage(
    args: RequeueDeadLetteredMessageRequestDTO,
  ): Promise<void> {
    const { ns, queueName, id, sequenceId, priority } = args;
    return this.messageManager.requeueDeadLetteredMessageAsync(
      {
        name: queueName,
        ns,
      },
      sequenceId,
      id,
      priority,
    );
  }

  async requeueAcknowledgedMessage(
    args: RequeueAcknowledgedMessageRequestDTO,
  ): Promise<void> {
    const { ns, queueName, id, sequenceId, priority } = args;
    return this.messageManager.requeueAcknowledgedMessageAsync(
      {
        name: queueName,
        ns,
      },
      sequenceId,
      id,
      priority,
    );
  }

  async purgeDeadLetteredMessages(
    args: PurgeDeadLetteredMessagesRequestDTO,
  ): Promise<void> {
    const { ns, queueName } = args;
    return this.messageManager.purgeDeadLetteredMessagesAsync({
      name: queueName,
      ns,
    });
  }

  async purgeAcknowledgedMessages(
    args: PurgeAcknowledgedMessagesRequestDTO,
  ): Promise<void> {
    const { ns, queueName } = args;
    return this.messageManager.purgeAcknowledgedMessagesAsync({
      name: queueName,
      ns,
    });
  }

  async purgePendingMessages(
    args: PurgePendingMessagesRequestDTO,
  ): Promise<void> {
    const { ns, queueName } = args;
    return this.messageManager.purgePendingMessagesAsync({
      name: queueName,
      ns,
    });
  }

  async purgePendingMessagesWithPriority(
    args: PurgePendingMessagesWithPriorityRequestDTO,
  ): Promise<void> {
    const { ns, queueName } = args;
    return this.messageManager.purgePendingMessagesWithPriorityAsync({
      name: queueName,
      ns,
    });
  }

  async purgeScheduledMessages(): Promise<void> {
    return this.messageManager.purgeScheduledMessagesAsync();
  }
}
