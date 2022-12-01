import type {
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceResponse
} from "aws-lambda";

import {ResourceType} from "./types";
import {
    ConnectPhoneNumberContactFlowAssociation,
    ConnectLexBotAssociation,
    ConnectLambdaFunctionAssociation,
} from "..";

export async function handler(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {

    const resourceType = ((): ResourceType => {
        const regexResults = /^Custom::(.*)$/.exec(event.ResourceType);
        if (!regexResults) {
            throw Error(`Unexpected ResourceType format: "${event.ResourceType}"`);
        }

        const result = regexResults[1]!; // Assertion guaranteed by regex

        return result as ResourceType; // TODO Could do validation here
    })();

    type Handler = (event: CloudFormationCustomResourceEvent) => Promise<CloudFormationCustomResourceResponse>;

    const handlers: Record<ResourceType, Handler> = {
        [ResourceType.LAMBDA_FUNCTION_ASSOCIATION]: ConnectLambdaFunctionAssociation.handleCloudFormationEvent,
        [ResourceType.LEX_BOT_ASSOCIATION]: ConnectLexBotAssociation.handleCloudFormationEvent,
        [ResourceType.PHONE_NUMBER_CONTACT_FLOW_ASSOCIATION]: ConnectPhoneNumberContactFlowAssociation.handleCloudFormationEvent,
    };

    return await handlers[resourceType](event);

}
