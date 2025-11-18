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

export interface SesIdentityAssociationProps {
    readonly connectInstanceId: string;
    readonly sesIdentityArn: string;
}

export class ConnectSesIdentityAssociation extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: SesIdentityAssociationProps) {
        super(scope, id, props, ResourceType.SES_IDENTITY_ASSOCIATION);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as SesIdentityAssociationProps;
        console.log({props});

        const integrationType: IntegrationType = "SES_IDENTITY";

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
                    (association) => association.IntegrationType === integrationType && association.IntegrationArn === props.sesIdentityArn
                );

                if (existsAlready) {
                    throw Error(`SES Identity ${props.sesIdentityArn} is already associated to Connect instance ${props.connectInstanceId}.`);
                }

                const associateCommand = new CreateIntegrationAssociationCommand({
                    InstanceId: props.connectInstanceId,
                    IntegrationType: integrationType,
                    IntegrationArn: props.sesIdentityArn,
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
                    (association) => association.IntegrationType === integrationType && association.IntegrationArn === props.sesIdentityArn
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
