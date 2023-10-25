import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import {
    AgentStatus,
    AgentStatusSummary,
    ConnectClient,
    CreateAgentStatusCommand,
    CreateAgentStatusRequest,
    paginateListAgentStatuses,
    UpdateAgentStatusCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface CreateAgentStatusProps extends Omit<CreateAgentStatusRequest, 'DisplayOrder' | 'Tags'> {
    InstanceId: string,
    Name: string,
}

export class ConnectAgentStatus extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: CreateAgentStatusProps) {
        super(scope, id, props, ResourceType.AGENT_STATUS);
    }

    get attrId(): string {
        return this.getAttString('AgentStatusId');
    }

    get attrArn(): string {
        return this.getAttString('AgentStatusARN'); // TODO Wondering if this is a type and should be Arn
    }


    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as CreateAgentStatusProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const existingStatus = await ConnectAgentStatus.getAgentStatus(props.InstanceId, props.Name);

                if (existingStatus) {
                    throw Error(`Agent status "${props.Name}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateAgentStatusCommand(props);
                const createCommandResponse = await connect.send(createCommand);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: {
                        AgentStatusId: createCommandResponse.AgentStatusId,
                        AgentStatusARN: createCommandResponse.AgentStatusARN,
                    },
                };

            }

            case "Update": {

                const newProps = props;
                const oldProps = JSON.parse(event.OldResourceProperties.PropString) as CreateAgentStatusProps;

                if (newProps.InstanceId !== oldProps.InstanceId) {
                    return await ConnectAgentStatus.handleCloudFormationEvent({...event, RequestType: 'Create'});
                }

                const currentStatus = await ConnectAgentStatus.getAgentStatus(oldProps.InstanceId, oldProps.Name);

                if (!currentStatus) {
                    throw Error(`Did not find Agent Status "${oldProps.Name}" on Connect instance ${oldProps.InstanceId} to update.`);
                }

                const updateCommand = new UpdateAgentStatusCommand({
                    AgentStatusId: currentStatus.AgentStatusId,
                    Description: newProps.Description,
                    InstanceId: newProps.InstanceId,
                    Name: newProps.Name,
                    State: newProps.State,
                });
                await connect.send(updateCommand);

                return {
                    ...event,
                    Status: "SUCCESS",
                    Data: {
                        AgentStatusId: currentStatus.AgentStatusId,
                        AgentStatusARN: currentStatus.AgentStatusARN,
                    },
                };

            }

            case "Delete": {

                throw Error('There is no AWS API to delete a Connect Agent Status. Resource must be retained and deletion skipped.');

            }

        }

    }

    static async getAgentStatus(instanceId: string, agentStatusName: string): Promise<AgentStatus | undefined> {

        const statuses: AgentStatusSummary[] = [];
        for await (const page of paginateListAgentStatuses({client: connect}, {InstanceId: instanceId})) {
            statuses.push(...page.AgentStatusSummaryList!);
        }

        return statuses.find(
            (status) => status.Name === agentStatusName,
        );

    }

}