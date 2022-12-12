import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as _ from "lodash";
import * as CDK from "aws-cdk-lib";
import {
    AssociateQueueQuickConnectsCommand,
    ConnectClient,
    CreateQueueCommand,
    CreateQueueRequest,
    DisassociateQueueQuickConnectsCommand,
    paginateListQueues,
    QueueSummary,
    UpdateQueueHoursOfOperationCommand,
    UpdateQueueMaxContactsCommand,
    UpdateQueueNameCommand,
    UpdateQueueOutboundCallerConfigCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface ConnectQueueProps extends CreateQueueRequest {
    InstanceId: string,
    Name: string,
    HoursOfOperationId: string,
    RemovalPolicy: CDK.RemovalPolicy.RETAIN, // Queues cannot be deleted.
}

export class ConnectQueue extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ConnectQueueProps) {
        super(scope, id, props, ResourceType.QUEUE);
        this.applyRemovalPolicy(props.RemovalPolicy);
    }

    get attrId(): string {
        return this.getAttString('QueueId');
    }

    get attrArn(): string {
        return this.getAttString('QueueArn');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ConnectQueueProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const existingQueue = await ConnectQueue.getQueue(props.InstanceId, props.Name);

                if (existingQueue) {
                    throw Error(`Queue "${props.Name}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateQueueCommand(props);
                const createCommandResponse = await connect.send(createCommand);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: {
                        QueueId: createCommandResponse.QueueId,
                        QueueArn: createCommandResponse.QueueArn,
                    },
                };

            }

            case "Update": {

                const newProps = props;
                const oldProps = JSON.parse(event.OldResourceProperties.PropString) as ConnectQueueProps;

                if (newProps.InstanceId !== oldProps.InstanceId) {
                    return await ConnectQueue.handleCloudFormationEvent({...event, RequestType: 'Create'});
                }

                const currentQueue = await ConnectQueue.getQueue(oldProps.InstanceId, oldProps.Name);

                if (!currentQueue) {
                    throw Error(`Did not find Queue "${oldProps.Name}" on Connect instance ${oldProps.InstanceId} to update.`);
                }

                if (newProps.HoursOfOperationId !== oldProps.HoursOfOperationId) {
                    const updateCommand = new UpdateQueueHoursOfOperationCommand({
                        InstanceId: newProps.InstanceId,
                        QueueId: currentQueue.Id,
                        HoursOfOperationId: newProps.HoursOfOperationId,
                    });
                    await connect.send(updateCommand);
                }

                if (newProps.MaxContacts !== oldProps.MaxContacts) {
                    const updateCommand = new UpdateQueueMaxContactsCommand({
                        InstanceId: newProps.InstanceId,
                        QueueId: currentQueue.Id,
                        MaxContacts: newProps.MaxContacts,
                    });
                    await connect.send(updateCommand);
                }

                if (newProps.Name !== oldProps.Name) {
                    const updateCommand = new UpdateQueueNameCommand({
                        InstanceId: newProps.InstanceId,
                        QueueId: currentQueue.Id,
                        Name: newProps.Name,
                    });
                    await connect.send(updateCommand);
                }

                if (!_.isEqual(newProps.OutboundCallerConfig, oldProps.OutboundCallerConfig)) {
                    const updateCommand = new UpdateQueueOutboundCallerConfigCommand({
                        InstanceId: newProps.InstanceId,
                        QueueId: currentQueue.Id,
                        OutboundCallerConfig: newProps.OutboundCallerConfig,
                    });
                    await connect.send(updateCommand);
                }

                if (!_.isEqual(newProps.QuickConnectIds, oldProps.QuickConnectIds)) {

                    const quickConnectsToRemove: string[] = _.difference(oldProps.QuickConnectIds || [], newProps.QuickConnectIds || []);
                    const quickConnectsToAdd: string[] = _.difference(newProps.QuickConnectIds || [], oldProps.QuickConnectIds || []);

                    const disassociateCommand = new DisassociateQueueQuickConnectsCommand({
                        InstanceId: newProps.InstanceId,
                        QueueId: currentQueue.Id,
                        QuickConnectIds: quickConnectsToRemove,
                    });
                    await connect.send(disassociateCommand);

                    const associateCommand = new AssociateQueueQuickConnectsCommand({
                        InstanceId: newProps.InstanceId,
                        QueueId: currentQueue.Id,
                        QuickConnectIds: quickConnectsToAdd,
                    });
                    await connect.send(associateCommand);

                }

                return {
                    ...event,
                    Status: "SUCCESS",
                    Data: {
                        QueueId: currentQueue.Id,
                        QueueArn: currentQueue.Arn,
                    },
                };

            }

            case "Delete": {

                throw Error('There is no AWS API to delete a Connect Queue. Resource must be retained and deletion skipped.');

            }

        }

    }

    static async getQueue(instanceId: string, queueName: string): Promise<QueueSummary | undefined> {

        const queues: QueueSummary[] = [];
        for await (const page of paginateListQueues({client: connect}, {InstanceId: instanceId})) {
            queues.push(...page.QueueSummaryList!);
        }

        return queues.find(
            (summary) => summary.Name === queueName,
        );

    }

}
