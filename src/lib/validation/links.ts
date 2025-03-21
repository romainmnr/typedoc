import { i18n, type Logger } from "#utils";
import {
    type Comment,
    type CommentDisplayPart,
    type ProjectReflection,
    type Reflection,
    ReflectionKind,
    ReflectionSymbolId,
} from "../models/index.js";

const linkTags = ["@link", "@linkcode", "@linkplain"];

function getBrokenPartLinks(parts: readonly CommentDisplayPart[]) {
    const links: string[] = [];

    for (const part of parts) {
        if (
            part.kind === "inline-tag" &&
            linkTags.includes(part.tag) &&
            (!part.target || part.target instanceof ReflectionSymbolId)
        ) {
            links.push(part.text.trim());
        }
    }

    return links;
}

function getBrokenLinks(comment: Comment | undefined) {
    if (!comment) return [];

    const links = [...getBrokenPartLinks(comment.summary)];
    for (const tag of comment.blockTags) {
        links.push(...getBrokenPartLinks(tag.content));
    }

    return links;
}

export function validateLinks(
    project: ProjectReflection,
    logger: Logger,
): void {
    for (const id in project.reflections) {
        checkReflection(project.reflections[id], logger);
    }

    if (!(project.id in project.reflections)) {
        checkReflection(project, logger);
    }
}

function checkReflection(reflection: Reflection, logger: Logger) {
    if (reflection.isProject() || reflection.isDeclaration()) {
        for (const broken of getBrokenPartLinks(reflection.readme || [])) {
            // #2360, "@" is a future reserved character in TSDoc component paths
            // If a link starts with it, and doesn't include a module source indicator "!"
            // then the user probably is trying to link to a package containing "@" with an absolute link.
            if (broken.startsWith("@") && !broken.includes("!")) {
                logger.warn(
                    i18n.failed_to_resolve_link_to_0_in_readme_for_1_may_have_meant_2(
                        broken,
                        reflection.getFriendlyFullName(),
                        broken.replace(/[.#~]/, "!"),
                    ),
                );
            } else {
                logger.warn(
                    i18n.failed_to_resolve_link_to_0_in_readme_for_1(
                        broken,
                        reflection.getFriendlyFullName(),
                    ),
                );
            }
        }
    }

    if (reflection.isDocument()) {
        for (const broken of getBrokenPartLinks(reflection.content)) {
            // #2360, "@" is a future reserved character in TSDoc component paths
            // If a link starts with it, and doesn't include a module source indicator "!"
            // then the user probably is trying to link to a package containing "@" with an absolute link.
            if (broken.startsWith("@") && !broken.includes("!")) {
                logger.warn(
                    i18n.failed_to_resolve_link_to_0_in_document_1_may_have_meant_2(
                        broken,
                        reflection.getFriendlyFullName(),
                        broken.replace(/[.#~]/, "!"),
                    ),
                );
            } else {
                logger.warn(
                    i18n.failed_to_resolve_link_to_0_in_document_1(
                        broken,
                        reflection.getFriendlyFullName(),
                    ),
                );
            }
        }
    }

    for (const broken of getBrokenLinks(reflection.comment)) {
        // #2360, "@" is a future reserved character in TSDoc component paths
        // If a link starts with it, and doesn't include a module source indicator "!"
        // then the user probably is trying to link to a package containing "@" with an absolute link.
        if (broken.startsWith("@") && !broken.includes("!")) {
            logger.warn(
                i18n.failed_to_resolve_link_to_0_in_comment_for_1_may_have_meant_2(
                    broken,
                    reflection.getFriendlyFullName(),
                    broken.replace(/[.#~]/, "!"),
                ),
            );
        } else {
            logger.warn(
                i18n.failed_to_resolve_link_to_0_in_comment_for_1(
                    broken,
                    reflection.getFriendlyFullName(),
                ),
            );
        }
    }

    if (
        reflection.isDeclaration() &&
        reflection.kindOf(ReflectionKind.TypeAlias) &&
        reflection.type?.type === "union" &&
        reflection.type.elementSummaries
    ) {
        for (
            const broken of reflection.type.elementSummaries.flatMap(
                getBrokenPartLinks,
            )
        ) {
            if (broken.startsWith("@") && !broken.includes("!")) {
                logger.warn(
                    i18n.failed_to_resolve_link_to_0_in_comment_for_1_may_have_meant_2(
                        broken,
                        reflection.getFriendlyFullName(),
                        broken.replace(/[.#~]/, "!"),
                    ),
                );
            } else {
                logger.warn(
                    i18n.failed_to_resolve_link_to_0_in_comment_for_1(
                        broken,
                        reflection.getFriendlyFullName(),
                    ),
                );
            }
        }
    }
}
