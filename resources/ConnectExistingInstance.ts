import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import {
    ConnectClient,
    InstanceSummary,
    paginateListInstances,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface ExistingInstanceProps {
    readonly instanceAlias: string;
}

export class ConnectExistingInstance extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ExistingInstanceProps) {
        super(scope, id, props, ResourceType.EXISTING_INSTANCE);
    }

    get attrArn(): string {
        return this.getAttString('Arn');
    }

    get attrId(): string {
        return this.getAttString('Id');
    }

    get attrIdentityManagementType(): string {
        return this.getAttString('IdentityManagementType');
    }

    get attrAccessUrl(): string {
        return this.getAttString('InstanceAccessUrl');
    }

    get attrAlias(): string {
        return this.getAttString('InstanceAlias');
    }

    get attrStatus(): string {
        return this.getAttString('InstanceStatus');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ExistingInstanceProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const instances: InstanceSummary[] = [];
                for await (const page of paginateListInstances({client: connect}, {})) {
                    instances.push(...page.InstanceSummaryList!);
                }

                const instance = instances.find(
                    (instance) => instance.InstanceAlias === props.instanceAlias
                );

                if (!instance) {
                    throw Error(`Could not find instance with alias "${props.instanceAlias}" in this account.`);
                }

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: instance,
                };

            }

            case "Delete": {

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

        }
    }

}
