'use server'

import { Dub } from "dub";

const dub = new Dub({
  token: process.env.DUB_API_KEY
});

export async function generateDiscussionInviteLink(discussionId: string) {
  try {
    const response = await dub.links.create({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/discussion/join/${discussionId}`,
    });
    // Extract the short URL from the response
    return { link: response.shortLink, error: null };
  } catch (error) {
    console.error('Error generating invite link:', error);
    return { link: null, error: 'Failed to generate invite link' };
  }
}