import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    ConnectClient,
    CreateIntegrationAssociationCommand,
    DeleteIntegrationAssociationCommand,
    IntegrationAssociationSummary,
    IntegrationType,
    paginateListIntegrationAssociations,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface WisdomQuickResponsesAssociationProps {
    readonly connectInstanceId: string;
    readonly wisdomKnowledgeBaseArn: string;
}

export class ConnectWisdomQuickResponsesAssociation extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: WisdomQuickResponsesAssociationProps) {
        super(scope, id, props, ResourceType.WISDOM_QUICK_RESPONSES_ASSOCIATION);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as WisdomQuickResponsesAssociationProps;
        console.log({props});

        const integrationType: IntegrationType = "WISDOM_QUICK_RESPONSES";

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const integrationAssociations: IntegrationAssociationSummary[] = [];
                for await (const page of paginateListIntegrationAssociations({client: connect}, {
                    InstanceId: props.connectInstanceId,
                })) {
                    integrationAssociations.push(...page.IntegrationAssociationSummaryList!);
                }

                const existsAlready = integrationAssociations.some(
                    (association) => association.IntegrationType === integrationType && association.IntegrationArn === props.wisdomKnowledgeBaseArn
                );

                if (existsAlready) {
                    throw Error(`Wisdom Quick Responses for Knowledge Base ${props.wisdomKnowledgeBaseArn} are already associated to Connect instance ${props.connectInstanceId}.`);
                }

                const associateCommand = new CreateIntegrationAssociationCommand({
                    InstanceId: props.connectInstanceId,
                    IntegrationType: integrationType,
                    IntegrationArn: props.wisdomKnowledgeBaseArn,
                });
                await connect.send(associateCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify(props)).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };
            }

            case "Delete": {

                const integrationAssociations: IntegrationAssociationSummary[] = [];
                for await (const page of paginateListIntegrationAssociations({client: connect}, {
                    InstanceId: props.connectInstanceId,
                })) {
                    integrationAssociations.push(...page.IntegrationAssociationSummaryList!);
                }

                const existingAssociation = integrationAssociations.find(
                    (association) => association.IntegrationType === integrationType && association.IntegrationArn === props.wisdomKnowledgeBaseArn
                );

                if (!existingAssociation) {
                    return {
                        ...event,
                        Status: "SUCCESS",
                    };
                }

                const command = new DeleteIntegrationAssociationCommand({
                    InstanceId: props.connectInstanceId,
                    IntegrationAssociationId: existingAssociation.IntegrationAssociationId,
                });
                await connect.send(command);

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

        }
    }

}
